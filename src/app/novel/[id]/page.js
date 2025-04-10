"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../services/supabase/supabaseClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { FaHome, FaBars, FaTimes, FaBookOpen } from "react-icons/fa";
import Link from "next/link";
import LoadingPage from "../../../components/LoadingPage";
import NovelCommentSection from "../../../components/Comments/NovelCommentSection";
import styles from "../../../styles/NovelPage.module.css";

export default function NovelPage() {
  const { id } = useParams();
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const [novel, setNovel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showConnectPopup, setShowConnectPopup] = useState(false);

  // Toggle mobile menu
  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
    setShowConnectPopup(false);
  };

  // Fetch novel data
  const fetchNovel = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("novels")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw new Error("Error fetching novel");
      setNovel(data);
    } catch (error) {
      console.error("Unexpected error:", error.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch novel data on mount, regardless of wallet connection
  useEffect(() => {
    fetchNovel();
  }, [fetchNovel]);

  // Handle navigation with wallet check for chapters beyond 1
  const handleNavigation = (path, chapterId) => {
    const chapterNum = parseInt(chapterId, 10);
    if (!connected && chapterNum > 1) { // Require connection for chapters 2+ (index 2+)
      setShowConnectPopup(true);
    } else {
      router.push(path);
    }
  };

  if (loading) return <LoadingPage />;

  if (!novel) {
    return (
      <div className={styles.errorContainer}>
        <h2 className={styles.errorText}>Novel not found</h2>
      </div>
    );
  }

  // Show connect popup only if triggered by navigation
  if (showConnectPopup) {
    return (
      <div className={styles.connectPopupOverlay}>
        <div className={`${styles.connectPopup} ${styles.dark}`}>
          <button onClick={() => setShowConnectPopup(false)} className={styles.closePopupButton}>
            <FaTimes />
          </button>
          <h3 className={styles.popupTitle}>Access Denied</h3>
          <p className={styles.popupMessage}>Connect your wallet to explore this chapter.</p>
          <WalletMultiButton className={styles.connectWalletButton} />
          <Link href="/" onClick={() => router.push("/")} className={styles.backHomeLink}>
            <FaHome /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.page} ${styles.dark}`}>
      {/* Futuristic Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <Link href="/" onClick={() => router.push("/")} className={styles.logoLink}>
            <img src="/images/logo.jpeg" alt="Sempai HQ" className={styles.logo} />
            <span className={styles.logoText}>Sempai HQ</span>
          </Link>
          <button className={styles.menuToggle} onClick={toggleMenu}>
            <FaBars />
          </button>
          <div className={`${styles.navLinks} ${menuOpen ? styles.navLinksOpen : ""}`}>
            <Link href="/" onClick={() => router.push("/")} className={styles.navLink}>
              <FaHome className={styles.navIcon} /> Home
            </Link>
            <Link href={`/novel/${id}/summary`} onClick={() => router.push(`/novel/${id}/summary`)} className={styles.navLink}>
              <FaBookOpen className={styles.navIcon} /> Summary
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className={styles.novelContainer}>
        <div className={styles.novelHeader}>
          <h1 className={styles.novelTitle}>{novel.title}</h1>
          <div className={styles.novelImageWrapper}>
            <img src={novel.image} alt={novel.title} className={styles.novelImage} />
            <div className={styles.imageGlow}></div>
          </div>
          <p className={styles.novelIntro}>
            Dive into the chapters of <span className={styles.highlight}>{novel.title}</span>:
          </p>
        </div>

        {/* Chapters Grid */}
        <div className={styles.chaptersGrid}>
          {Object.entries(novel.chaptertitles || {}).map(([chapterId, title]) => (
            <Link
              href={`/novel/${id}/chapter/${chapterId}`}
              onClick={() => handleNavigation(`/novel/${id}/chapter/${chapterId}`, chapterId)}
              key={chapterId}
              className={styles.chapterCard}
            >
              <div className={styles.chapterContent}>
                <h3 className={styles.chapterTitle}>{title}</h3>
                <div className={styles.chapterHoverEffect}></div>
              </div>
            </Link>
          ))}
        </div>

        {/* Comments Section */}
        <NovelCommentSection novelId={novel.id} novelTitle={novel.title} />
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>© 2025 Sempai HQ. All rights reserved.</p>
      </footer>
    </div>
  );
}