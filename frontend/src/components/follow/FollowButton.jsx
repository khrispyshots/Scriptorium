import React from 'react';
import { useApp } from '../../context/AppContext';

export default function FollowButton({
  entityId,
  entityType = 'creator', // 'user' | 'creator' | 'agent'
  variant = 'default',
  onChange
}) {
  const { currentUser, follows, toggleFollow } = useApp();

  const isOwn = currentUser && entityId === currentUser.id;
  const isFollowing = follows.some(
    f => f.followingId === entityId && f.followingType === entityType
  );

  const handleFollowClick = (e) => {
    e.stopPropagation();
    if (isOwn) return;

    toggleFollow(entityId, entityType);
    if (onChange) {
      onChange(!isFollowing);
    }
  };

  if (isOwn) {
    if (variant === 'compact') return null;
    return (
      <button className="rounded-lg border border-stone-gray/25 bg-transparent px-3 py-1.5 text-[10px] font-semibold leading-none text-stone-gray transition-colors hover:border-gold/30 hover:text-gold">
        Edit Profile
      </button>
    );
  }

  const buttonText = isFollowing ? 'Following' : 'Follow';
  const buttonStyle = isFollowing
    ? 'bg-transparent border-stone-gray/30 text-stone-gray hover:bg-stone-gray/5 font-bold'
    : 'bg-gold text-obsidian hover:bg-gold/90 font-bold border-gold';

  return (
    <button
      onClick={handleFollowClick}
      className={`flex items-center justify-center rounded-lg border px-3 py-1.5 text-[10px] font-semibold leading-none transition-colors duration-200 ${buttonStyle}`}
    >
      {buttonText}
    </button>
  );
}
