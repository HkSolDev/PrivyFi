'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAnchorProgram } from './useAnchorProgram';

export function useUserProfile() {
  const { program, wallet, getPdas } = useAnchorProgram();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async () => {
    if (!program || !wallet) return;

    try {
      const { userProfilePda } = getPdas(wallet.publicKey, "");
      const profileAcc = await program.account.userProfile.fetch(userProfilePda);
      setProfile(profileAcc);
    } catch (e) {
      console.log("No profile account found yet.");
    } finally {
      setLoading(false);
    }
  }, [program, wallet, getPdas]);

  useEffect(() => {
    fetchProfile();
  }, [program, wallet, getPdas, fetchProfile]);

  return { profile, loading, refresh: fetchProfile };
}
