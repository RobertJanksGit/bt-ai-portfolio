import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebase";
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";

const ProjectCard = ({ asset, userData, onCommentClick, selectedUser }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const imageUrls = asset.imageUrls || [asset.imageUrl]; // Fallback for old assets

  useEffect(() => {
    if (!imageUrls?.length) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === imageUrls.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, [imageUrls]);

  // Check for unread messages using only Firestore real-time updates
  useEffect(() => {
    if (!userData) return;

    const commentsRef = collection(db, "comments");
    let q;

    if (userData.role === "admin") {
      // For admin, check if there are any unread messages from users
      // Only filter by user if one is selected
      const baseQuery = [
        where("assetId", "==", asset.id),
        where("userRole", "==", "user"),
        where("isRead", "==", false),
      ];

      if (selectedUser) {
        q = query(
          commentsRef,
          ...baseQuery,
          where("userId", "!=", selectedUser.uid)
        );
      } else {
        q = query(commentsRef, ...baseQuery);
      }
    } else {
      // For users, check if there are any unread messages from admin
      q = query(
        commentsRef,
        where("assetId", "==", asset.id),
        where("userRole", "==", "admin"),
        where("isRead", "==", false),
        where("recipientId", "==", userData.uid)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasUnreadMessages(!snapshot.empty);
    });

    return () => unsubscribe();
  }, [asset.id, userData, selectedUser]);

  const handleCommentClick = () => {
    onCommentClick(asset);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-transform hover:scale-105">
      <div className="relative">
        <img
          src={imageUrls[currentImageIndex]}
          alt={asset.title}
          className="w-full h-72 object-cover transition-all duration-500"
        />
        {asset.isWorkInProgress && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-md text-xs font-medium">
            Work in Progress
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 truncate">
          {asset.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4 whitespace-pre-wrap">
          {asset.description}
        </p>
        {asset.techStack && asset.techStack.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {asset.techStack.map((tech, index) => (
                <span
                  key={index}
                  className="inline-block bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded-md text-xs"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            {!asset.isWorkInProgress && asset.url && (
              <a
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors duration-200"
              >
                Live Demo
              </a>
            )}
            {asset.githubUrl && (
              <a
                href={asset.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm transition-colors duration-200 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                GitHub
              </a>
            )}
          </div>
          <div
            className={`relative ${!asset.isWorkInProgress ? "" : "ml-auto"}`}
          >
            {userData ? (
              <button
                onClick={handleCommentClick}
                className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </button>
            ) : (
              <div className="relative group">
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </Link>
                <div className="absolute z-50 -top-10 right-0 hidden group-hover:block">
                  <div className="bg-black text-white text-xs rounded py-1.5 px-3 whitespace-nowrap">
                    Login to comment
                    <div className="absolute w-2 h-2 bg-black transform rotate-45 translate-y-[2px] right-[10px]"></div>
                  </div>
                </div>
              </div>
            )}
            {hasUnreadMessages && (
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse"></span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

ProjectCard.propTypes = {
  asset: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    url: PropTypes.string,
    githubUrl: PropTypes.string,
    imageUrls: PropTypes.arrayOf(PropTypes.string),
    imageUrl: PropTypes.string,
    isWorkInProgress: PropTypes.bool,
    techStack: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  userData: PropTypes.shape({
    role: PropTypes.string.isRequired,
    uid: PropTypes.string.isRequired,
  }),
  onCommentClick: PropTypes.func.isRequired,
  selectedUser: PropTypes.shape({
    uid: PropTypes.string.isRequired,
  }),
};

const Landing = () => {
  const { userData } = useAuth();
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const commentsEndRef = useRef(null);
  const [usersWithUnread, setUsersWithUnread] = useState(new Set());

  // Fetch users for admin
  useEffect(() => {
    const fetchUsers = async () => {
      if (userData?.role === "admin") {
        try {
          const usersRef = collection(db, "users");
          const userSnapshot = await getDocs(usersRef);
          const userList = userSnapshot.docs
            .map((doc) => ({
              uid: doc.id,
              ...doc.data(),
            }))
            .filter((user) => user.role === "user"); // Only get regular users
          setUsers(userList);
        } catch (error) {
          console.error("Error fetching users:", error);
        }
      }
    };
    fetchUsers();
  }, [userData]);

  useEffect(() => {
    if (userData?.role !== "admin") return;

    const checkUnreadMessages = async () => {
      try {
        const commentsRef = collection(db, "comments");
        const q = query(
          commentsRef,
          where("userRole", "==", "user"),
          where("isRead", "==", false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const unreadUsers = new Set();
          snapshot.docs.forEach((doc) => {
            const comment = doc.data();
            unreadUsers.add(comment.userId);
          });
          setUsersWithUnread(unreadUsers);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error checking unread messages:", error);
      }
    };

    checkUnreadMessages();
  }, [userData?.role]);

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isModalOpen) {
      scrollToBottom();
    }
  }, [comments, isModalOpen]);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const assetsCollection = collection(db, "assets");
        const assetSnapshot = await getDocs(assetsCollection);
        const assetList = assetSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAssets(assetList);
      } catch (error) {
        console.error("Error fetching assets:", error);
      }
    };

    fetchAssets();
  }, []);

  const scrollToProjects = () => {
    document.getElementById("projects").scrollIntoView({ behavior: "smooth" });
  };

  const fetchComments = async (assetId) => {
    try {
      const commentsRef = collection(db, "comments");
      const usersRef = collection(db, "users");

      if (userData?.role === "admin" && selectedUser) {
        // Admin viewing specific user's conversation
        const q = query(
          commentsRef,
          where("assetId", "==", assetId),
          where("userId", "in", [selectedUser.uid, "admin"]),
          where("recipientId", "in", [selectedUser.uid, "admin"]),
          orderBy("createdAt", "asc")
        );

        const commentSnapshot = await getDocs(q);
        const commentList = await Promise.all(
          commentSnapshot.docs.map(async (doc) => {
            const commentData = doc.data();
            // Get user profile data
            if (commentData.userId !== "admin") {
              const userDoc = await getDocs(
                query(usersRef, where("uid", "==", commentData.userId))
              );
              if (!userDoc.empty) {
                const userData = userDoc.docs[0].data();
                commentData.userPhotoURL = userData.photoURL;
              }
            } else {
              // For admin messages, use the current admin's photo
              commentData.userPhotoURL = userData.photoURL;
            }
            return {
              id: doc.id,
              ...commentData,
              createdAt: commentData.createdAt?.toDate(),
            };
          })
        );

        setComments(commentList);
      } else if (userData?.role === "user") {
        // Regular user viewing their conversation
        const q = query(
          commentsRef,
          where("assetId", "==", assetId),
          where("recipientId", "in", [userData.uid, "admin"]),
          where("userId", "in", [userData.uid, "admin"]),
          orderBy("createdAt", "asc")
        );

        const commentSnapshot = await getDocs(q);
        const commentList = await Promise.all(
          commentSnapshot.docs.map(async (doc) => {
            const commentData = doc.data();
            // For admin messages, get admin profile
            if (commentData.userId === "admin") {
              const adminDoc = await getDocs(
                query(usersRef, where("role", "==", "admin"))
              );
              if (!adminDoc.empty) {
                const adminData = adminDoc.docs[0].data();
                commentData.userPhotoURL = adminData.photoURL;
              }
            } else {
              // For user's own messages
              commentData.userPhotoURL = userData.photoURL;
            }
            return {
              id: doc.id,
              ...commentData,
              createdAt: commentData.createdAt?.toDate(),
            };
          })
        );

        setComments(commentList);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleCommentClick = async (asset) => {
    setSelectedAsset(asset);
    setIsModalOpen(true);

    if (userData?.role === "admin") {
      // For admin, wait for user selection before fetching comments
      if (selectedUser) {
        await fetchComments(asset.id);
      }
    } else {
      // For regular users, mark all admin messages for this asset as read
      const commentsRef = collection(db, "comments");
      const q = query(
        commentsRef,
        where("assetId", "==", asset.id),
        where("userRole", "==", "admin"),
        where("recipientId", "==", userData.uid),
        where("isRead", "==", false)
      );
      const batch = writeBatch(db);
      const unreadSnapshot = await getDocs(q);
      unreadSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { isRead: true });
      });
      await batch.commit();
      await fetchComments(asset.id);
    }
  };

  // Add effect to fetch comments when selectedUser changes for admin
  useEffect(() => {
    if (userData?.role === "admin" && selectedUser && selectedAsset) {
      const markMessagesAsRead = async () => {
        // Mark all unread messages from this user as read
        const commentsRef = collection(db, "comments");
        const q = query(
          commentsRef,
          where("assetId", "==", selectedAsset.id),
          where("userId", "==", selectedUser.uid),
          where("isRead", "==", false)
        );
        const batch = writeBatch(db);
        const unreadSnapshot = await getDocs(q);
        unreadSnapshot.docs.forEach((doc) => {
          batch.update(doc.ref, { isRead: true });
        });
        await batch.commit();
      };

      fetchComments(selectedAsset.id);
      markMessagesAsRead();
    }
  }, [selectedUser, selectedAsset]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const commentData = {
        assetId: selectedAsset.id,
        userId: userData.role === "admin" ? "admin" : userData.uid,
        userName: userData.name || userData.email,
        userRole: userData.role,
        content: newComment,
        createdAt: serverTimestamp(),
        isRead: false,
        recipientId: userData.role === "admin" ? selectedUser.uid : "admin",
      };

      await addDoc(collection(db, "comments"), commentData);
      setNewComment("");
      await fetchComments(selectedAsset.id);
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="pt-20">
        {/* Hero Section */}
        <div className="container mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-8">
            Hi, I&apos;m Robert 👋
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
            I&apos;m a passionate Full Stack Developer who loves turning ideas
            into reality through code. When I&apos;m not coding, you can find me
            free diving, spear fishing, or enjoying the great outdoors!
          </p>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
            Take a look at my projects below, and feel free to reach out if
            you&apos;d like to collaborate or just chat about tech!
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={scrollToProjects}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Projects
            </button>
            <button
              onClick={() => setIsContactModalOpen(true)}
              className="px-6 py-3 border border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors"
            >
              Let&apos;s Connect
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        <div id="projects" className="container mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {assets.map((asset) => (
              <ProjectCard
                key={asset.id}
                asset={asset}
                userData={userData}
                onCommentClick={handleCommentClick}
                selectedUser={selectedUser}
              />
            ))}
          </div>
        </div>

        {/* Contact Modal */}
        {isContactModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Let&apos;s Connect!
                </h2>
                <button
                  onClick={() => setIsContactModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                I&apos;m always excited to connect with fellow developers and
                potential collaborators. Feel free to reach out through any of
                these channels!
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <a
                    href="mailto:robert.jank@yahoo.com"
                    className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors group flex-grow"
                  >
                    <svg
                      className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <div className="flex flex-col">
                      <span className="text-gray-800 dark:text-gray-200 font-medium">
                        Drop me an email
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 text-sm">
                        robert.jank@yahoo.com
                      </span>
                    </div>
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("robert.jank@yahoo.com");
                      // You can add a toast notification here if you want
                    }}
                    className="p-3 bg-blue-50 hover:bg-blue-100 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    title="Copy email address"
                  >
                    <svg
                      className="w-6 h-6 text-blue-600 dark:text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                      />
                    </svg>
                  </button>
                </div>
                <a
                  href="https://www.linkedin.com/in/robert-jank/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors group"
                >
                  <svg
                    className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                  <div className="flex flex-col">
                    <span className="text-gray-800 dark:text-gray-200 font-medium">
                      Connect on LinkedIn
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 text-sm">
                      Let&apos;s grow our network
                    </span>
                  </div>
                </a>
                <a
                  href="https://github.com/RobertJanksGit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors group"
                >
                  <svg
                    className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <div className="flex flex-col">
                    <span className="text-gray-800 dark:text-gray-200 font-medium">
                      Check out my GitHub
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 text-sm">
                      See what I&apos;m working on
                    </span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Comments Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
              {/* Fixed Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Comments for {selectedAsset?.title}
                  </h2>
                  {userData?.role === "admin" && (
                    <div className="mt-2">
                      <select
                        value={selectedUser?.uid || ""}
                        onChange={(e) => {
                          const user = users.find(
                            (u) => u.uid === e.target.value
                          );
                          setSelectedUser(user);
                          if (user) {
                            // Mark all unread messages from this user as read for all assets
                            const markMessagesAsRead = async () => {
                              const commentsRef = collection(db, "comments");
                              const q = query(
                                commentsRef,
                                where("userId", "==", user.uid),
                                where("isRead", "==", false)
                              );
                              const batch = writeBatch(db);
                              const unreadSnapshot = await getDocs(q);
                              unreadSnapshot.docs.forEach((doc) => {
                                batch.update(doc.ref, { isRead: true });
                              });
                              await batch.commit();
                            };
                            markMessagesAsRead();
                            fetchComments(selectedAsset.id);
                          }
                        }}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="">
                          Select a user to view conversation
                        </option>
                        {users.map((user) => (
                          <option
                            key={user.uid}
                            value={user.uid}
                            className="flex items-center justify-between"
                          >
                            {user.name || user.email}
                            {usersWithUnread.has(user.uid) && " 🔴"}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    if (userData?.role === "admin") {
                      setSelectedUser(null);
                    }
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {userData?.role === "admin" && !selectedUser ? (
                  <div className="text-center text-gray-600 dark:text-gray-400">
                    Please select a user to view their conversation
                  </div>
                ) : (
                  <div className="space-y-4 mb-4">
                    {comments.map((comment) => {
                      // Determine if this message should be on the right
                      const isOwnMessage =
                        (userData.role === "admin" &&
                          comment.userId === "admin") ||
                        (userData.role === "user" &&
                          comment.userId === userData.uid);

                      return (
                        <div
                          key={comment.id}
                          className={`p-4 rounded-lg w-2/3 ${
                            isOwnMessage
                              ? "bg-blue-50 dark:bg-blue-900/30 ml-auto"
                              : "bg-gray-50 dark:bg-gray-700/50"
                          }`}
                        >
                          <div
                            className={`flex justify-between items-start mb-2 ${
                              isOwnMessage ? "flex-row-reverse" : ""
                            }`}
                          >
                            <div
                              className={`flex items-center gap-2 ${
                                isOwnMessage ? "flex-row-reverse" : ""
                              }`}
                            >
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                {comment.userPhotoURL ? (
                                  <img
                                    src={comment.userPhotoURL}
                                    alt={comment.userName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                    {comment.userName
                                      ?.charAt(0)
                                      ?.toUpperCase() || "U"}
                                  </span>
                                )}
                              </div>
                              <div
                                className={`flex items-center gap-2 ${
                                  isOwnMessage ? "flex-row-reverse" : ""
                                }`}
                              >
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {comment.userName}
                                </span>
                                <span
                                  className={`text-xs px-2 py-1 rounded ${
                                    comment.userRole === "admin"
                                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300"
                                      : "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                                  }`}
                                >
                                  {comment.userRole}
                                </span>
                              </div>
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {comment.createdAt?.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-center">
                            <p className="text-gray-700 dark:text-gray-300">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={commentsEndRef} />
                  </div>
                )}
              </div>

              {/* Fixed Footer with Comment Form */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-6">
                {(userData?.role !== "admin" || selectedUser) && (
                  <form onSubmit={handleSubmitComment}>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (newComment.trim()) {
                            handleSubmitComment(e);
                          }
                        }
                      }}
                      placeholder="Write your comment... (Press Enter to send, Shift + Enter for new line)"
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      rows="3"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        disabled={!newComment.trim()}
                      >
                        Send Comment
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Landing;
