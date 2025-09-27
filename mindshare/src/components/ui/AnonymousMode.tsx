"use client";

import { useState } from "react";
import Button from "./Button";
import { Eye, User, Lock, ArrowLeft } from "lucide-react";

interface AnonymousModeProps {
  onEnterAnonymous: (username: string) => void;
}

export default function AnonymousMode({ onEnterAnonymous }: AnonymousModeProps) {
  const [username, setUsername] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleEnterAnonymous = () => {
    if (username.trim()) {
      onEnterAnonymous(username.trim());
    } else {
      onEnterAnonymous("Anonymous User");
    }
  };

  if (!showForm) {
    return (
      <div className="text-center space-y-8">
        {/* Icon */}
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm">
          <Eye size={40} className="text-white" />
        </div>
        
        {/* Content */}
        <div>
          <h3 className="text-3xl font-bold text-white mb-4">Browse Anonymously</h3>
          <p className="text-white/80 text-base leading-relaxed max-w-sm mx-auto">
            Explore the community feed without signing in. You can read posts but won't be able to like, comment, or create journals.
          </p>
        </div>
        
        {/* Button */}
        <button
          onClick={() => setShowForm(true)}
          className="w-full h-14 inline-flex items-center justify-center gap-4 rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border border-white/30 text-white transition-all duration-200 backdrop-blur-sm hover:shadow-xl transform hover:scale-[1.02]"
        >
          <User size={24} />
          <span className="font-semibold text-lg">Enter as Guest</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
          <User size={32} className="text-white" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">Choose Your Display Name</h3>
        <p className="text-white/80 text-base">
          This is how you'll appear in the community (optional)
        </p>
      </div>

      {/* Form */}
      <div className="space-y-6">
        <div>
          <label className="block text-base font-medium text-white/90 mb-3">
            Display Name
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter a display name (optional)"
            className="w-full px-5 py-4 bg-white/10 border border-white/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 backdrop-blur-sm text-lg"
            maxLength={30}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleEnterAnonymous();
              }
            }}
          />
        </div>

        {/* Warning */}
        <div className="bg-amber-500/20 border border-amber-400/30 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <Lock size={20} className="text-amber-300 mt-1 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-amber-100 font-semibold mb-3 text-base">Anonymous Mode Limitations:</p>
              <ul className="text-amber-200/80 text-sm space-y-2">
                <li>• Can only view community posts</li>
                <li>• Cannot create journals or posts</li>
                <li>• Cannot like or comment on posts</li>
                <li>• Cannot access personal features</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => setShowForm(false)}
            className="flex-1 h-14 inline-flex items-center justify-center gap-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/30 text-white transition-all duration-200 backdrop-blur-sm hover:shadow-xl transform hover:scale-[1.02]"
          >
            <ArrowLeft size={20} />
            <span className="font-semibold text-lg">Back</span>
          </button>
          <button
            onClick={handleEnterAnonymous}
            className="flex-1 h-14 inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border border-white/30 text-white transition-all duration-200 backdrop-blur-sm hover:shadow-xl transform hover:scale-[1.02]"
          >
            <Eye size={20} />
            <span className="font-semibold text-lg">Enter Anonymously</span>
          </button>
        </div>
      </div>
    </div>
  );
}
