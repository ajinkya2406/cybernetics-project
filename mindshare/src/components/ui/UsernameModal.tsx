"use client";

import { useState, useEffect } from "react";
import Card from "./Card";
import Button from "./Button";
import { X, User, Eye, EyeOff } from "lucide-react";
import { apiPatch } from "@/lib/api";
import toast from "react-hot-toast";

type UsernameModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  userId: string;
  onUsernameChange: (newUsername: string) => void;
  userData?: {
    originalName?: string;
    anonymousName?: string;
  };
};

export default function UsernameModal({
  isOpen,
  onClose,
  currentUsername,
  userId,
  onUsernameChange,
  userData
}: UsernameModalProps) {
  const [originalName, setOriginalName] = useState(userData?.originalName || currentUsername);
  const [anonymousName, setAnonymousName] = useState(userData?.anonymousName || `Anonymous_${Math.random().toString(36).substr(2, 9)}`);
  const [saving, setSaving] = useState(false);
  const [showAnonymous, setShowAnonymous] = useState(false);
  const MAX_LENGTH = 50;

  useEffect(() => {
    if (isOpen) {
      console.log("UsernameModal userData:", userData);
      setOriginalName(userData?.originalName || currentUsername);
      setAnonymousName(userData?.anonymousName || `Anonymous_${Math.random().toString(36).substr(2, 9)}`);
    }
  }, [isOpen, currentUsername, userData]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (originalName.trim().length === 0) {
      toast.error("Original name cannot be empty.");
      return;
    }
    if (anonymousName.trim().length === 0) {
      toast.error("Anonymous name cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        originalName: originalName.trim(),
        anonymousName: anonymousName.trim()
      };
      console.log("Sending update data:", updateData);
      await apiPatch(`/api/users/${userId}`, updateData);
      
      onUsernameChange(originalName.trim());
      toast.success("Names updated successfully!");
      onClose();
    } catch (error: any) {
      console.error("Name update error:", error);
      if (error?.message?.includes("CORS")) {
        toast.error("Network error. Please try again.");
      } else {
        toast.error(error?.message || "Failed to update names");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  const generateRandomAnonymous = () => {
    setAnonymousName(`Anonymous_${Math.random().toString(36).substr(2, 9)}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full hover:bg-slate-100">
          <X size={20} className="text-slate-600" />
        </button>
        
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Manage Your Names</h2>
        
        <div className="space-y-4">
          {/* Original Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <User size={16} className="inline mr-2" />
              Original Name (Private)
            </label>
            <input
              type="text"
              value={originalName}
              onChange={(e) => setOriginalName(e.target.value.slice(0, MAX_LENGTH))}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300"
              placeholder="Enter your original name"
              maxLength={MAX_LENGTH}
            />
            <p className="text-xs text-slate-500 mt-1">
              This name is only visible to you and won't appear in community posts.
            </p>
          </div>

          {/* Anonymous Name */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                <Eye size={16} className="inline mr-2" />
                Anonymous Name (Community)
              </label>
              <button
                onClick={generateRandomAnonymous}
                className="text-xs text-sky-600 hover:text-sky-800 underline"
              >
                Generate Random
              </button>
            </div>
            <input
              type="text"
              value={anonymousName}
              onChange={(e) => setAnonymousName(e.target.value.slice(0, MAX_LENGTH))}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300"
              placeholder="Enter your anonymous name"
              maxLength={MAX_LENGTH}
            />
            <p className="text-xs text-slate-500 mt-1">
              This name will appear in community feed posts.
            </p>
          </div>

          {/* Character Counts */}
          <div className="flex justify-between text-xs text-slate-500">
            <span>Original: {originalName.length}/{MAX_LENGTH}</span>
            <span>Anonymous: {anonymousName.length}/{MAX_LENGTH}</span>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button onClick={onClose} variant="secondary" className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </Card>
    </div>
  );
}