"use client";

import { useState, useEffect, useContext } from "react"; // Added useContext
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/services/supabase/supabaseClient";
import LoadingPage from "@/components/LoadingPage";
import { FaBook, FaRocket, FaGlobe, FaTwitter, FaDiscord, FaWallet, FaHome, FaExchangeAlt, FaBars, FaTimes } from "react-icons/fa";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import styles from "../CreatorsProfile.module.css";
import Link from "next/link";
import ConnectButton from "@/components/ConnectButton"; // Added ConnectButton
import { EmbeddedWalletContext } from "@/components/EmbeddedWalletProvider"; // Added EmbeddedWalletContext

export default function CreatorsProfilePage() {
  const { connected, publicKey } = useWallet();
  const { wallet: embeddedWallet } = useContext(EmbeddedWalletContext); // Access embedded wallet
  const router = useRouter();
  const { userId } = useParams();
  const [userRole, setUserRole] = useState("writer"); // "writer", "artist", "both", "superuser"
  const [creatorData, setCreatorData] = useState(null);
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [walletReady, setWalletReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  useEffect(() => {
    if (connected || embeddedWallet) setWalletReady(true); // Check both external and embedded wallets
  }, [connected, publicKey, embeddedWallet]);

  useEffect(() => {
    const fetchProfileDetails = async () => {
      if (!userId) {
        setError("No user ID provided.");
        setLoading(false);
        return;
      }

      try {
        const { data: user, error: userError } = await supabase
          .from("users")
          .select("id, isWriter, isArtist, isSuperuser, name, wallet_address, image")
          .eq("id", userId)
          .single();

        if (userError || !user) throw new Error(`User not found: ${userError?.message || "No user data"}`);

        // Determine user role
        if (user.isSuperuser) setUserRole("superuser");
        else if (user.isWriter && user.isArtist) setUserRole("both");
        else if (user.isArtist) setUserRole("artist");
        else if (user.isWriter) setUserRole("writer");
        else {
          setError("This user is not a creator.");
          setLoading(false);
          return;
        }

        // Check if this is the user's own profile using either external or embedded wallet
        if (walletReady && (publicKey?.toString() === user.wallet_address || embeddedWallet?.publicKey === user.wallet_address)) {
          setIsOwnProfile(true);
        }

        const { data: profile, error: profileError } = await supabase
          .from("writer_profiles")
          .select("bio, twitter, discord, website")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError && profileError.code !== "PGRST116") console.error("Profile fetch error:", profileError);

        const { data: novelsData, error: novelsError } = await supabase
          .from("novels")
          .select("id, title, image, summary")
          .eq("user_id", user.id);

        if (novelsError) throw new Error(`Novels fetch error: ${novelsError.message}`);

        setCreatorData({ ...user, ...profile });
        setNovels(novelsData || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileDetails();
  }, [userId, walletReady, publicKey, embeddedWallet]); // Added embeddedWallet to dependencies

  const handleNavigation = (path) => router.push(path);

  if (loading) return <LoadingPage />;

  return (
    <div className={`${styles.page} ${styles[userRole]} ${menuOpen ? styles.menuActive : ""}`}>
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <Link href="/" className={styles.logoLink}>
            <img src="/images/logo.jpeg" alt="Sempai HQ" className={styles.logo} />
            <span className={styles.logoText}>Sempai HQ</span>
          </Link>
          <button className={styles.menuToggle} onClick={toggleMenu}>
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
          <div className={`${styles.navLinks} ${menuOpen ? styles.navLinksOpen : ""}`}>
            <Link href="/" className={styles.navLink}><FaHome /> Home</Link>
            {isOwnProfile && (
              <Link href="/editprofile" className={styles.navLink}><FaExchangeAlt /> Edit Profile</Link>
            )}
            <ConnectButton /> {/* Added ConnectButton for wallet status */}
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.title}><FaRocket /> Creator’s Nexus</h1>
          {error ? (
            <div className={styles.errorContainer}>
              <p className={styles.error}>{error}</p>
              {isOwnProfile && (
                <button onClick={() => handleNavigation("/profile")} className={styles.navButton}>
                  <img src={creatorData?.image || "/images/default-profile.jpg"} alt="Profile" className={styles.profileIcon} />
                  Back to Profile
                </button>
              )}
            </div>
          ) : (
            <>
              <section className={styles.profileCard}>
                <h2 className={styles.sectionTitle}>
                  <img src={creatorData?.image || "/images/default-profile.jpg"} alt="Profile" className={styles.profileIcon} />
                  {creatorData?.name || creatorData?.wallet_address.slice(0, 8)}
                </h2>
                <p className={styles.bio}>{creatorData?.bio || "No bio provided."}</p>
                <div className={styles.socials}>
                  {creatorData?.twitter && (
                    <a href={`https://twitter.com/${creatorData.twitter}`} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                      <FaTwitter /> @{creatorData.twitter}
                    </a>
                  )}
                  {creatorData?.discord && (
                    <span className={styles.socialLink}><FaDiscord /> {creatorData.discord}</span>
                  )}
                  {creatorData?.website && (
                    <a href={creatorData.website} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                      <FaGlobe /> Website
                    </a>
                  )}
                </div>
                <p className={styles.walletInfo}><FaWallet /> {creatorData?.wallet_address.slice(0, 8)}...</p>
              </section>
              <section className={styles.novelsSection}>
                <h2 className={styles.sectionTitle}><FaBook /> Creations</h2>
                {novels.length > 0 ? (
                  <div className={styles.novelGrid}>
                    {novels.map((novel) => (
                      <div key={novel.id} className={styles.novelCard}>
                        <img src={novel.image} alt={novel.title} className={styles.novelImage} />
                        <h3 className={styles.novelTitle}>{novel.title}</h3>
                        <p className={styles.novelSummary}>{novel.summary.slice(0, 100)}...</p>
                        <button onClick={() => handleNavigation(`/novel/${novel.id}`)} className={styles.novelButton}>
                          <FaBook /> Read More
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.placeholder}>No creations yet.</p>
                )}
              </section>
              {isOwnProfile && (
                <div className={styles.profileActions}>
                  <button onClick={() => handleNavigation("/editprofile")} className={styles.navButton}>
                    <img src={creatorData?.image || "/images/default-profile.jpg"} alt="Profile" className={styles.profileIcon} />
                    Edit Profile
                  </button>
                  <button onClick={() => handleNavigation("/creators-dashboard")} className={styles.navButton}>
                    <FaRocket /> Creator Dashboard
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}