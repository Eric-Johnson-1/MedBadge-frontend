import React, { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, ABI } from "../contracts/contractConfig";
import { useWalletContext } from "../contexts/WalletContext";
import isEqual from "lodash.isequal";

// Reusable NFTCard Component for displaying a single NFT
const NFTCard = ({ nft }) => {
  return (
    <div className="bg-blue-500 border border-blue-600 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 overflow-hidden flex flex-col">
      {/* Image Section with Lazy Loading */}
      <div className="relative">
        <img
          src={nft.image || "https://via.placeholder.com/300"}
          alt={nft.name || "NFT"}
          className="w-full h-48 object-cover blur-sm transition-all duration-500 ease-in-out"
          loading="lazy"
          onLoad={(e) => e.target.classList.remove("blur-sm")}
          onError={(e) => {
            e.target.classList.remove("blur-sm");
            e.target.src =
              "https://via.placeholder.com/300?text=Image+Not+Found";
          }}
        />
        <div className="absolute inset-0 bg-black bg-opacity-20 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
      </div>

      {/* NFT Info Section */}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-semibold text-white mb-2 truncate">
          {nft.name || "Untitled NFT"}
        </h3>
        <p className="text-sm text-gray-300 mb-4 line-clamp-3">
          {nft.description || "No description available."}
        </p>

        {/* Attributes Section */}
        <div className="text-sm text-gray-200 space-y-1 flex-grow">
          {nft.attributes && nft.attributes.length > 0 ? (
            nft.attributes.map((attr, index) => (
              <div key={index} className="flex items-start gap-2 break-words">
                <span className="font-semibold text-gray-100">
                  {attr.trait_type || "Attribute"}:
                </span>
                <span>{attr.value || "N/A"}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-400">No attributes available.</p>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="bg-blue-600 p-3 text-center">
        <button className="w-full py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white font-bold shadow-md hover:shadow-lg transition-transform duration-300 transform hover:scale-105">
          View Details
        </button>
      </div>
    </div>
  );
};

const MyNFTs = () => {
  const { walletAddress } = useWalletContext(); // Get wallet address from Context
  const [nfts, setNFTs] = useState([]); // Store NFT data
  const [loading, setLoading] = useState(false); // Loading state
  const [error, setError] = useState(null); // Error state

  // Fetch NFTs from the contract
  const fetchNFTs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

      const [tokenIds, tokenURIs] = await contract.getMyNFTs();

      const formattedNFTs = await Promise.all(
        tokenURIs.map(async (uri, index) => {
          try {
            const metadataUrl = uri.replace(
              "ipfs://",
              "https://gateway.pinata.cloud/ipfs/"
            );
            const response = await fetch(metadataUrl);
            if (!response.ok) throw new Error("Failed to fetch metadata");

            const metadata = await response.json();

            return {
              id: tokenIds[index].toString(),
              name: metadata.name || `NFT #${tokenIds[index]}`,
              description: metadata.description || "No description available.",
              image: metadata.image
                ? metadata.image.replace(
                    "ipfs://",
                    "https://gateway.pinata.cloud/ipfs/"
                  )
                : "https://via.placeholder.com/300",
              attributes: metadata.attributes || [],
            };
          } catch (err) {
            console.error(
              `Error fetching metadata for token ${tokenIds[index]}:`,
              err
            );
            return null;
          }
        })
      );

      // Update state only if the data has actually changed to prevent unnecessary re-renders
      const validNFTs = formattedNFTs.filter((nft) => nft !== null);
      if (!isEqual(validNFTs, nfts)) {
        setNFTs(validNFTs);
      }
    } catch (err) {
      console.error("Failed to fetch NFTs:", err);
      setError("Failed to load your NFTs. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [nfts]);

  useEffect(() => {
    if (!walletAddress) return; // Prevent unnecessary requests if wallet address is empty
    fetchNFTs();
  }, [walletAddress, fetchNFTs]);

  return (
    <div className="min-h-screen bg-blue-600 text-white p-8">
      <h2 className="text-4xl font-bold text-center mb-10 text-white">
        My NFT Collection
      </h2>

      {/* Wallet Not Connected State */}
      {!walletAddress && (
        <div className="text-center p-8 bg-blue-700 rounded-lg max-w-2xl mx-auto shadow-lg">
          <h3 className="text-2xl font-semibold mb-4">Connect Your Wallet</h3>
          <p className="mb-6">
            Please connect your wallet to view your NFT collection.
          </p>
          <button className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-bold transition-colors duration-300">
            Connect Wallet
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && walletAddress && (
        <p className="text-center">Loading your NFTs...</p>
      )}

      {/* Error State */}
      {error && <p className="text-red-400 text-center">{error}</p>}

      {/* NFT List */}
      {!loading && walletAddress && nfts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {nfts.map((nft) => (
            <NFTCard key={nft.id} nft={nft} />
          ))}
        </div>
      )}

      {/* No NFTs */}
      {!loading && walletAddress && nfts.length === 0 && !error && (
        <p className="text-center text-gray-200">You don't own any NFTs.</p>
      )}
    </div>
  );
};

export default MyNFTs;
