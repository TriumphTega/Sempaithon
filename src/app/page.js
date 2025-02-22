'use client';

import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { NovelConnectButton } from '../components/NovelConnectButton';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase/supabaseClient';
import LoadingPage from '../components/LoadingPage';
import BootstrapProvider from "../components/BootstrapProvider";
import 'bootstrap/dist/css/bootstrap.min.css';
import ConnectButton from '../components/ConnectButton';
import Notifications from "@/components/Notifications";

export default function Home() {
  const router = useRouter();
  const [isCreatorLoggedIn, setIsCreatorLoggedIn] = useState(false);
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const { connected, publicKey } = useWallet(); // Get wallet publicKey

  const [isWriter, setIsWriter] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!connected || !publicKey) return;
  
      const walletAddress = publicKey.toString();
      
      // Fetch the actual user_id from the `users` table
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", walletAddress)
        .single();
  
      if (userError || !user) {
        console.error("Error fetching user ID:", userError?.message);
        return;
      }
  
      const userId = user.id; // Get actual user_id
  
      // Fetch notifications for this user
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)  // Use dynamic user ID
        .eq("is_read", false)
        .order("created_at", { ascending: false });
  
      if (error) {
        console.error("Error fetching notifications:", error.message);
      } else {
        setNotifications(data);
      }
    };
  
    fetchNotifications();
  }, [connected, publicKey]); // Fetch notifications when wallet connects
  
  // Function to mark notifications as read
  const markAsRead = async () => {
    if (!connected || !publicKey) return;
  
    const walletAddress = publicKey.toString();
  
    // Fetch user ID
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", walletAddress)
      .single();
  
    if (userError || !user) {
      console.error("Error fetching user ID:", userError?.message);
      return;
    }
  
    const userId = user.id;
  
    // Mark all notifications as read
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId);
  
    setNotifications([]); // Clear notifications after marking as read
  };
  
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!connected || !publicKey) return;
  
      const walletAddress = publicKey.toString();
      const { data: user, error } = await supabase
        .from('users')
        .select('isWriter')
        .eq('wallet_address', walletAddress)
        .single();
  
      if (error) {
        console.error('Error fetching user details:', error.message);
        return;
      }
  
      setIsWriter(user?.isWriter || false);
    };
  
    fetchUserDetails();
  }, [connected, publicKey]);
  

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsCreatorLoggedIn(true);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    fetchNovels();
  }, []);
  
  const fetchNovels = async () => {
    const { data, error } = await supabase.from('novels').select('*');
    if (error) {
      console.error('Error fetching novels:', error);
    } else {
      setNovels(data);
    }
    setLoading(false); // Set loading to false after data is fetched
  };

  const handleCreatorAccess = async () => {
    if (!connected || !publicKey) {
      alert('Please connect your wallet first.');
      return;
    }
  
    try {
      const walletAddress = publicKey.toString();
  
      // Fetch the user's details from the `users` table
      const { data: user, error } = await supabase
        .from('users')
        .select('isWriter')
        .eq('wallet_address', walletAddress)
        .single();
  
      if (error) {
        console.error('Error fetching user:', error.message);
        alert('Unable to verify user. Please try again later.');
        return;
      }
  
      if (user?.isWriter) {
        router.push('/creators-dashboard'); // Redirect to Creator Dashboard
      } else {
        alert('Access denied. You must be a creator to access this page.');
      }
    } catch (err) {
      console.error('Error handling creator access:', err.message);
      alert('An error occurred. Please try again later.');
    }
  };
  

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <div className="bg-black">
      <BootstrapProvider />
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark py-3 shadow">
  <div className="container">
    {/* Brand Logo */}
    <Link href="/" className="navbar-brand">
    <img
  src="/images/logo.jpg"  // The path is correct if the image is in the public folder
  alt="Sempai HQ"
  className="navbar-logo"
  style={{ width: "40px", height: "40px", borderRadius: "50%" }}
/>

    </Link>
{/* 🔔 Notification Icon */}
          <div className="position-relative">
            <button
              className="btn btn-warning position-relative"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              🔔
              {notifications.length > 0 && (
                <span className="badge bg-danger position-absolute top-0 start-100 translate-middle">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Dropdown for Notifications */}
{showDropdown && (
  <div className="dropdown-menu show p-2">
    {notifications.length > 0 ? (
      notifications.map((notif) => (
        <div key={notif.id} className="dropdown-item">
          {notif.type === "reply" && notif.comment_id ? (
            <Link href={`/novel/${notif.novel_id}/chapter/${notif.comment_id}`}>
              📩 Someone replied to your comment: "{notif.message}"
            </Link>
          ) : notif.type === "new_chapter" ? (
            <Link href={`/novel/${notif.novel_id}`}>
              📖 A new chapter has been added to "{notif.novel_title}"
            </Link>
          ) : notif.type === "reward" ? (
            <Link href="/profile">
              🎉 You've received a weekly reward! Check your balance.
            </Link>
          ) : (
            <span>{notif.message || "You have a new notification"}</span>
          )}
        </div>
      ))
    ) : (
      <div className="dropdown-item">No new notifications</div>
    )}
    {notifications.length > 0 && (
      <button className="btn btn-sm btn-danger mt-2" onClick={markAsRead}>
        Mark as Read
      </button>
    )}
  </div>
)}

          </div>
    {/* Toggle Button for Mobile View */}
    <button
      className="navbar-toggler"
      type="button"
      data-bs-toggle="collapse"
      data-bs-target="#navbarNav"
      aria-controls="navbarNav"
      aria-expanded="false"
      aria-label="Toggle navigation"
    >
      <span className="navbar-toggler-icon"></span>
    </button>

    {/* Navbar Links */}
    <div className="collapse navbar-collapse" id="navbarNav">
      <ul className="navbar-nav me-auto text-center">
        <li className="nav-item">
          <Link href="/" className="nav-link text-light fw-semibold hover-effect">
            Home
          </Link>
        </li>
        <li className="nav-item">
          <Link href="/swap" className="nav-link text-light fw-semibold hover-effect">
            Swap
          </Link>
        </li>
        <li className="nav-item">
          <Link href="/profile" className="nav-link text-light fw-semibold hover-effect">
            Profile
          </Link>
        </li>
        <li className="nav-item">
          <Link href="/chat" className="nav-link text-light fw-semibold hover-effect">
            Chat
          </Link>
        </li>
      </ul>

      {/* Wallet and Creator Dashboard Section */}
      <ul className="navbar-nav ms-auto text-center">
        {/* Wallet Connect Button */}
        <li className="nav-item me-lg-3 mb-3 mb-lg-0">
          <ConnectButton className="btn btn-light btn-sm rounded-pill px-3 py-2 text-dark" />
        </li>

        {/* Conditional Rendering for Creator Dashboard & Writer Application */}
        <li className="nav-item">
          {connected ? (
            isWriter ? (
              <button
                onClick={handleCreatorAccess}
                className="btn btn-warning btn-sm rounded-pill text-dark fw-bold px-4 py-2"
              >
                Creator Dashboard
              </button>
            ) : (
              <Link href="/apply" className="btn btn-primary btn-sm rounded-pill px-4 py-2 text-dark fw-bold">
                  Apply to be a Creator
              </Link>
            )
          ) : (
            <button className="btn btn-light btn-sm rounded-pill text-dark fw-bold px-4 py-2" disabled>
              Connect Wallet to Access
            </button>
          )}
        </li>
      </ul>
    </div>
  </div>
</nav>


      {/* Hero Section */}
      <header className="bg-orange py-5 text-center text-white" style={{ background: 'linear-gradient(135deg,rgb(243, 99, 22), #feb47b)' }}>
        <div className="container">
          <h1 className="display-4 fw-bold">Welcome to Sempai HQ</h1>
          <p className="lead fs-4">Explore your favorite novels and earn tokens!</p>
        </div>
      </header>

      {/* Novels Grid */}
      <div className="container my-5">
        {novels.length > 0 ? (
          <div className="row g-4">
            {novels.map((novel) => (
              <div key={novel.id} className="col-md-4">
                <div className="image-container">
                  <Link href={`/novel/${novel.id}`} className="text-decoration-none">
                    <img
                      src={novel.image}
                      className="img-fluid shadow rounded-3 hover-image"
                      alt={novel.title}
                    />
                    <div className="image-title">
                      <h5 className="fw-bold text-uppercase">{novel.title}</h5>
                    </div>
                  </Link>
                  {!connected && (
                    <div className="overlay d-flex align-items-center justify-content-center">
                      <NovelConnectButton />
                    </div>
                  )}
                </div>
              </div>
            ))}

             {/* Additional Hoard Example */}
    <div className="col-md-4">
          <div className="image-container">
            {/* Conditional Rendering Based on Connection Status */}
            {connected ? (
              <Link href="/novels" className="text-decoration-none">
                {/* Image */}
                <img
                  src="/images/novel-3.jpg"
                  className="img-fluid shadow rounded-3 hover-image"
                  alt="Hoard"
                />

                {/* Title */}
                <div className="image-title">
                  <h5 className="fw-bold text-uppercase">Hoard</h5>
                </div>
              </Link>
            ) : (
              <div className="position-relative">
                {/* Image */}
                <img
                  src="/images/novel-3.jpg"
                  className="img-fluid shadow rounded-3 hover-image"
                  alt="Hoard"
                />

                {/* Title */}
                <div className="image-title">
                  <h5 className="fw-bold text-uppercase">Hoard</h5>
                </div>

                {/* Overlay for Disconnected Users */}
                <div className="overlay d-flex align-items-center justify-content-center">
                  <NovelConnectButton />
                </div>
              </div>
            )}
          </div>
        </div>


      {/* Card Example */}
      <div className="col-md-4">
          <div className="image-container">
            {/* Conditional Rendering Based on Connection Status */}
            {connected ? (
              <Link href="/keep-it-simple" className="text-decoration-none">
                {/* Image */}
                <img
                  src="/images/novel-4.jpg"
                  className="img-fluid shadow rounded-3 hover-image"
                  alt="KISS (Keep it simple, stupid)"
                />

                {/* Title */}
                <div className="image-title">
                  <h5 className="fw-bold text-uppercase">KISS (Keep it simple, stupid)</h5>
                </div>
              </Link>
            ) : (
              <div className="position-relative">
                {/* Image */}
                <img
                  src="/images/novel-4.jpg"
                  className="img-fluid shadow rounded-3 hover-image"
                  alt="KISS (Keep it simple, stupid)"
                />

                {/* Title */}
                <div className="image-title">
                  <h5 className="fw-bold text-uppercase">KISS (Keep it simple, stupid)</h5>
                </div>

                {/* Overlay for Disconnected Users */}
                <div className="overlay d-flex align-items-center justify-content-center">
                  <NovelConnectButton />
                </div>
              </div>
            )}
          </div>
          </div>
          {/* Card Example */}
          <div className="col-md-4">
          <div className="image-container">
            {/* Conditional Rendering Based on Connection Status */}
            {connected ? (
              <Link href="/dao-governance" className="text-decoration-none">
                {/* Image */}
                <img
                  src="/images/dao.jpg"
                  className="img-fluid shadow rounded-3 hover-image"
                  alt="KISS (Keep it simple, stupid)"
                />

                {/* Title */}
                <div className="image-title">
                  <h5 className="fw-bold text-uppercase">DAO Governance</h5>
                </div>
              </Link>
            ) : (
              <div className="position-relative">
                {/* Image */}
                <img
                  src="/images/dao.jpg"
                  className="img-fluid shadow rounded-3 hover-image"
                  alt="KISS (Keep it simple, stupid)"
                />

                {/* Title */}
                <div className="image-title">
                  <h5 className="fw-bold text-uppercase">DAO Governance</h5>
                </div>

                {/* Overlay for Disconnected Users */}
                <div className="overlay d-flex align-items-center justify-content-center">
                  <NovelConnectButton />
                </div>
              </div>
            )}
          </div>
          </div>

          </div>
        ) : (
          <p className="text-center text-white">No novels available at the moment.</p>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-dark py-4 text-center text-white shadow-lg">
        <p>&copy; 2025 Sempai HQ. All rights reserved.</p>
      </footer>
    </div>
  );
}
