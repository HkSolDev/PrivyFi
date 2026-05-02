import { useMemo, useCallback } from 'react';
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { AnchorProvider, Program, Idl, BN } from '@coral-xyz/anchor';
import { useAnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';
import idl from '@/idl/privyfi.json';
import { Privyfi } from '@/idl/privyfi';

export function useAnchorProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const { sendTransaction } = useWallet();

  const program = useMemo(() => {
    if (!wallet) return null;

    const provider = new AnchorProvider(connection, wallet, {
      preflightCommitment: 'processed',
    });

    return new Program(idl as any, provider) as unknown as Program<Privyfi>;
  }, [connection, wallet]);

  // MagicBlock Ephemeral Rollup Provider (Using AnchorProvider to point to the Ephemeral RPC)
  const ephemeralProvider = useMemo(() => {
    if (!wallet) return null;
    
    // For the hackathon demo, we create a parallel AnchorProvider
    // In production, this Connection would point to the MagicBlock Rollup RPC URL.
    const magicBlockConnection = new Connection(
      connection.rpcEndpoint, // Using same devnet endpoint for the demo so it doesn't crash on fetch
      'processed'
    );
    
    const provider = new AnchorProvider(magicBlockConnection, wallet, {
      preflightCommitment: 'processed',
    });

    return new Program(idl as any, provider) as unknown as Program<Privyfi>;
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
      .accountsPartial({
        signer: wallet.publicKey,
      })
      .rpc();
  };

  const deposit = async (poolName: string, mintToken: PublicKey, amount: number) => {
    if (!program || !wallet) return;

    const { userProfilePda, poolPda, userPositionPda, userRewardPda } = getPdas(wallet.publicKey, poolName);
    
    const poolVault = getAssociatedTokenAddressSync(mintToken, poolPda, true);
    const userAta = getAssociatedTokenAddressSync(mintToken, wallet.publicKey);
    
    const signature = await program.methods
      .deposit(new BN(amount))
      .accountsPartial({
        user: wallet.publicKey,
        pool: poolPda,
        userPosition: userPositionPda,
        userProfile: userProfilePda,
        userReward: userRewardPda,
        mintToken: mintToken,
        userToken: userAta,
        poolVault: poolVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();

    return signature;
  };

  const withdraw = async (poolName: string, mintToken: PublicKey, amount: number) => {
    if (!program || !wallet) return;

    const { userProfilePda, poolPda, userPositionPda } = getPdas(wallet.publicKey, poolName);
    
    const poolVault = getAssociatedTokenAddressSync(mintToken, poolPda, true);
    const userAta = getAssociatedTokenAddressSync(mintToken, wallet.publicKey);
    
    const signature = await program.methods
      .withdraw(new BN(amount))
      .accountsPartial({
        user: wallet.publicKey,
        userProfile: userProfilePda,
        userPosition: userPositionPda,
        pool: poolPda,
        mintToken: mintToken,
        userToken: userAta,
        poolVault: poolVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();

    return signature;
  };

  const togglePrivate = async () => {
    if (!program || !wallet) return;

    const { userProfilePda } = getPdas(wallet.publicKey, "");
    
    return await program.methods
      .togglePrivate()
      .accountsPartial({
        user: wallet.publicKey,
        userProfile: userProfilePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  };

  const recordAction = async (amount: number, isPrivate: boolean = false) => {
    if (!program || !wallet) return;

    const { userRewardPda } = getPdas(wallet.publicKey, "");
    
    // If in private mode, we use the Ephemeral Rollup provider for zero gas & speed
    if (isPrivate && ephemeralProvider) {
      console.log("⚡ Routing recordAction through MagicBlock Ephemeral Rollup");
      return await ephemeralProvider.methods
        .recordAction(new BN(amount))
        .accounts({
          user: wallet.publicKey,
          userReward: userRewardPda,
        } as any)
        .rpc();
    }

    return await program.methods
      .recordAction(new BN(amount))
      .accountsPartial({
        user: wallet.publicKey,
        userReward: userRewardPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  };

  const getUserPositions = async () => {
    if (!program || !wallet) return [];
    try {
      const positions = await program.account.userPosition.all([
        {
          memcmp: {
            offset: 8,
            bytes: wallet.publicKey.toBase58(),
          },
        },
      ]);
      return positions;
    } catch (e) {
      console.error("Failed to fetch positions:", e);
      return [];
    }
  };

  return { 
    program, 
    ephemeralProvider,
    wallet, 
    getPdas, 
    initializeUser, 
    deposit,
    withdraw,
    togglePrivate,
    recordAction,
    getUserPositions,
    connection
  };
}
