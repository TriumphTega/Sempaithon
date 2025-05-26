import { NextResponse } from "next/server";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import bs58 from "bs58";
import { supabaseAdmin } from "@/app/api/supabaseAdmin";
import { SMP_MINT_ADDRESS, RPC_URL } from "@/constants";

const AIRDROP_KEYPAIR = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(process.env.AIRDROP_WALLET_KEYPAIR ?? "[]")),
);

const AIRDROP_SMP_AMOUNT = 500_000 * 1e6;

const connection = new Connection(RPC_URL);

function throwOnError({ data, error }) {
  if (error) throw error;
  return data;
}

export async function POST(req) {
  const { user_id } = await req.json();
  if (!user_id) {
    return NextResponse.json(
      { error: `Invalid user id: ${user_id}` },
      { status: 400 },
    );
  }

  const userWallet = await getOrCreateUserWallet(user_id);
  if (!userWallet) {
    return NextResponse.json(
      { error: "User not found" },
      {
        status: 404,
      },
    );
  }

  const userKeypair = Keypair.fromSecretKey(
    Uint8Array.from(bs58.decode(userWallet.private_key)),
  );
  const user = userKeypair.publicKey;

  const smpAta = {
    treasury: getAssociatedTokenAddressSync(
      SMP_MINT_ADDRESS,
      AIRDROP_KEYPAIR.publicKey,
    ),
    user: getAssociatedTokenAddressSync(SMP_MINT_ADDRESS, user),
  };
  const [userSmpAccountInfo] = await connection.getMultipleAccountsInfo([
    smpAta.user,
  ]);
  if (userSmpAccountInfo) {
    return NextResponse.json(
      { error: `user ${user} already has received SMP airdrop` },
      { status: 400 },
    );
  }

  const transaction = new Transaction();

  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 27_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10_000 }),

    createAssociatedTokenAccountInstruction(
      AIRDROP_KEYPAIR.publicKey,
      smpAta.user,
      user,
      SMP_MINT_ADDRESS,
    ),
    createTransferInstruction(
      smpAta.treasury,
      smpAta.user,
      AIRDROP_KEYPAIR.publicKey,
      AIRDROP_SMP_AMOUNT,
    ),
  );
  transaction.feePayer = AIRDROP_KEYPAIR.publicKey;

  let signature = null;
  let confirmationError = null;
  try {
    signature = await sendAndConfirmTransaction(connection, transaction, [
      AIRDROP_KEYPAIR,
    ]);
  } catch (e) {
    confirmationError = e?.message;
  }

  return NextResponse.json({
    userPublicKey: user,
    signature,
    confirmationError,
  });
}

async function getOrCreateUserWallet(user_id) {
  const newKeypair = Keypair.generate();
  await supabaseAdmin
    .from("user_wallets")
    .upsert(
      {
        user_id,
        address: newKeypair.publicKey.toString(),
        private_key: bs58.encode(newKeypair.secretKey),
      },
      {
        onConflict: "user_id",
        ignoreDuplicates: true,
      },
    )
    .then(throwOnError);

  return supabaseAdmin
    .from("user_wallets")
    .select()
    .eq("user_id", user_id)
    .single()
    .then(throwOnError);
}
