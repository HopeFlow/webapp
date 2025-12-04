"use client";

import { useState } from "react";
import { HopeflowLogo } from "@/components/logos/hopeflow";

const SAMPLE_AVATARS = [
  "https://i.pravatar.cc/150?u=1",
  "https://i.pravatar.cc/150?u=2",
  "https://i.pravatar.cc/150?u=3",
  "https://i.pravatar.cc/150?u=4",
  "https://i.pravatar.cc/150?u=5",
  "https://i.pravatar.cc/150?u=6",
];

export default function OGTestPage() {
  const [coverImage, setCoverImage] = useState(
    "https://images.unsplash.com/photo-1592419044706-39796d40f98c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2025&q=80",
  );
  const [inviterName, setInviterName] = useState("Alex");
  const [inviteeName, setInviteeName] = useState("Sarah");
  const [linkType, setLinkType] = useState<"broadcast" | "targeted">(
    "targeted",
  );
  const [rewardPoints, setRewardPoints] = useState(500);
  const [chainCount, setChainCount] = useState(2);

  const avatarsToShow = [
    SAMPLE_AVATARS[0], // Inviter
    ...Array(Math.min(chainCount, 3))
      .fill(null)
      .map((_, i) => SAMPLE_AVATARS[i + 1]),
    null, // Invitee placeholder
  ];

  return (
    <div className="flex min-h-screen bg-gray-100 p-8 font-sans text-gray-900">
      {/* Controls */}
      <div className="w-1/3 space-y-6 rounded-xl bg-white p-6 shadow-lg">
        <h1 className="mb-6 text-2xl font-bold">OG Image Generator</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Cover Image URL
            </label>
            <input
              type="text"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Inviter Name
              </label>
              <input
                type="text"
                value={inviterName}
                onChange={(e) => setInviterName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Invitee Name
              </label>
              <input
                type="text"
                value={inviteeName}
                onChange={(e) => setInviteeName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Link Type
            </label>
            <select
              value={linkType}
              onChange={(e) =>
                setLinkType(e.target.value as "broadcast" | "targeted")
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500 focus:outline-none"
            >
              <option value="targeted">Targeted</option>
              <option value="broadcast">Broadcast</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Reward Points
            </label>
            <input
              type="number"
              value={rewardPoints}
              onChange={(e) => setRewardPoints(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Chain Count (Intermediate)
            </label>
            <input
              type="number"
              min="0"
              max="3"
              value={chainCount}
              onChange={(e) => setChainCount(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="flex w-2/3 items-center justify-center bg-gray-200 p-8">
        <div
          className="relative overflow-hidden bg-white shadow-2xl"
          style={{
            width: "1200px",
            height: "630px",
            transform: "scale(0.7)", // Scale down for viewing
            transformOrigin: "center",
          }}
        >
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${coverImage})` }}
          />

          {/* Gradient Overlay - Darker and smoother */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, #022c22 0%, #064e3b 25%, rgba(6, 78, 59, 0.4) 60%, transparent 100%)",
            }}
          />

          {/* Logo */}
          <div className="absolute top-12 left-12 flex items-center gap-4">
            <HopeflowLogo size={100} fillColor="#ffffff" />
            <span
              className="text-7xl font-bold tracking-tighter text-white drop-shadow-lg"
              style={{ fontFamily: "sans-serif" }}
            >
              HopeFlow
            </span>
          </div>

          {/* Avatar Chain Container */}
          <div className="absolute inset-x-0 bottom-48 flex items-center justify-center">
            {/* Connecting Line - Absolute behind avatars */}
            <div
              className="absolute top-1/2 h-1 w-3/4 -translate-y-1/2 bg-white/40"
              style={{ left: "12.5%" }}
            />

            <div className="relative flex w-full items-center justify-center gap-16">
              {/* Inviter */}
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="h-36 w-36 overflow-hidden rounded-full border-4 border-white shadow-xl">
                  <img
                    src={SAMPLE_AVATARS[0]}
                    alt="Inviter"
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="text-3xl font-bold text-white drop-shadow-md">
                  {inviterName}
                </span>
              </div>

              {/* Intermediates */}
              {Array.from({ length: chainCount }).map((_, i) => (
                <div
                  key={i}
                  className="relative z-10 flex flex-col items-center gap-3"
                >
                  <div className="h-36 w-36 overflow-hidden rounded-full border-4 border-white shadow-xl">
                    <img
                      src={SAMPLE_AVATARS[i + 1]}
                      alt={`Person ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="text-3xl font-bold text-white drop-shadow-md">
                    User {i + 1}
                  </span>
                </div>
              ))}

              {/* Invitee (You) - Highlighted */}
              <div className="relative z-10 flex flex-col items-center gap-3">
                {/* Glow Effect */}
                <div className="absolute top-1/2 left-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-400/30 blur-2xl" />

                <div className="relative flex h-44 w-44 items-center justify-center overflow-hidden rounded-full border-8 border-green-400 bg-green-100 shadow-2xl">
                  <svg
                    className="h-28 w-28 text-green-700"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
                <div className="text-center">
                  <span className="block text-4xl font-bold text-white drop-shadow-md">
                    You
                  </span>
                  <span className="block text-2xl text-white/90 drop-shadow-md">
                    (or {inviteeName})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Text Overlay */}
          <div className="absolute inset-x-0 bottom-20 text-center">
            <p className="text-4xl font-medium text-white drop-shadow-md">
              {inviterName} is waiting for your contribution to keep the hope
              flowing.
            </p>
          </div>

          {/* Reward Points */}
          <div className="absolute right-12 bottom-10 flex items-center gap-3">
            <span className="text-4xl font-medium text-white drop-shadow-md">
              {rewardPoints} Points Reward
            </span>
            {/* Leaf Icon */}
            <svg
              className="h-12 w-12 text-green-400 drop-shadow-md"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
