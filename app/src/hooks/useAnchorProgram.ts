import { useMemo, useCallback } from 'react';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program, Idl, BN } from '@coral-xyz/anchor';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import idl from '@/idl/privyfi.json';

export function useAnchorProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const program = useMemo(() => {
    if (!wallet) return null;

    const provider = new AnchorProvider(connection, wallet, {
      preflightCommitment: 'processed',
    });

    return new Program(idl as Idl, provider);
  }, [connection, wallet]);

  const getPdas = useCallback((userPubkey: PublicKey, poolName: string) => {
    const programId = new PublicKey(idl.address);
    
    const [userProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), userPubkey.toBuffer()],
      programId
    );

    const [userRewardPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("reward"), userPubkey.toBuffer()],
      programId
    );

    const [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), Buffer.from(poolName)],
      programId
    );

    const [userPositionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), userPubkey.toBuffer(), poolPda.toBuffer()],
      programId
    );

    return { userProfilePda, userRewardPda, poolPda, userPositionPda };
  }, []);

  const initializeUser = async () => {
    if (!program || !wallet) return;
    return await program.methods
      .initializeUser()
      .accounts({
        signer: wallet.publicKey,
      })
      .rpc();
  };

  const deposit = async (poolName: string, mintToken: PublicKey, amount: number) => {
    if (!program || !wallet) return;

    const { userProfilePda, poolPda, userPositionPda, userRewardPda } = getPdas(wallet.publicKey, poolName);
    
    // We assume the pool vault is the ATA of the pool PDA
    const poolVault = getAssociatedTokenAddressSync(mintToken, poolPda, true);
    
    return await program.methods
      .deposit(new BN(amount))
      .accounts({
        user: wallet.publicKey,
        pool: poolPda,
        userPosition: userPositionPda,
        userProfile: userProfilePda,
        userReward: userRewardPda,
        mintToken: mintToken,
        poolVault: poolVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();
  };

  const togglePrivate = async () => {
    if (!program || !wallet) return;

    const { userProfilePda } = getPdas(wallet.publicKey, "");
    
    return await program.methods
      .togglePrivate()
      .accounts({
        user: wallet.publicKey,
        userProfile: userProfilePda,
      })
      .rpc();
  };

  return { 
    program, 
    wallet, 
    getPdas, 
    initializeUser, 
    deposit,
    togglePrivate
  };
}
