import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { MetaHeader } from "~~/components/MetaHeader";
import { useAccount } from "wagmi";
import { InputBase, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useSignMessage } from "wagmi";
import { notification } from "~~/utils/scaffold-eth";
import Image from "next/image";
import Confetti from "react-confetti";

const Home: NextPage = () => {
  const { address } = useAccount();
  const [isMember, setIsMember] = useState(false);
  const [isLoadingMember, setLoadingMember] = useState(false);
  const [currentAlias, setCurrentAlias] = useState("");
  const [isLoadingAlias, setLoadingAlias] = useState(false);
  const [changingAlias, setChangingAlias] = useState(false);
  const [newAlias, setNewAlias] = useState("");
  const [updatingAlias, setUpdatingAlias] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const { signMessageAsync } = useSignMessage({
    message: JSON.stringify({ action: "save-alias", address: address, alias: newAlias }),
    async onSuccess(data) {
      console.log("Successfully signed message", data);
      const response = await fetch(`/api/aliases/${address}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ alias: newAlias, signature: data }),
      });

      console.log("Response", response);

      if (response.ok) {
        const data = await response.json();
        if (!currentAlias) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 15000);
        }
        setCurrentAlias(data);
        setNewAlias("");
        setChangingAlias(false);
        setUpdatingAlias(false);
      } else {
        const data = await response.json();
        console.log("Error changing alias", data);
        notification.error(data.error);
      }
    }
  });

  const bgUrl = "https://buidlguidl-v3.ew.r.appspot.com/builders";

  useEffect(() => {
    const updateMember = async () => {
      try {
        setLoadingMember(true);
        const response = await fetch(bgUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          setIsMember(data.filter((member: any) => member.id === address).length > 0);
        }
      } catch (e) {
        console.log("Error checking if user is a bg member", e);
      } finally {
        setLoadingMember(false);
      }
    };

    if (address) {
      updateMember();
    }
  }, [address]);

  useEffect(() => {
    const updateAlias = async () => {
      try {
        setLoadingAlias(true);
        const response = await fetch(`/api/aliases/${address}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentAlias(data);
        }
      } catch (e) {
        console.log("Error getting member alias", e);
      } finally {
        setLoadingAlias(false);
      }
    };

    if (address && isMember) {
      updateAlias();
    }
  }, [address, isMember]);

  const changeAlias = async () => {
    try {
      setUpdatingAlias(true);
      await signMessageAsync();
    } catch (e) {
      console.log("Error changing member alias", e);
      notification.error("Error changing alias");
    } finally {
      setUpdatingAlias(false);
    }
  }

  return (
    <>
      <MetaHeader />
      <div className="flex items-center flex-col flex-grow pt-10 bg-[url(/assets/hero.png)] bg-[#EFFBCA] bg-cover md:bg-center bg-[position:40%_0] flex-grow">
        <div className="px-5">
          <h1 className="text-center mb-8 text-black">
            <span className="block text-2xl mb-2">Free ENS to</span>
            <span className="block text-4xl font-bold">BuidlGuidl Members</span>
          </h1>
          <div className="flex flex-col bg-base-300 px-2 py-2 text-center items-center w-96 rounded-3xl text-2xl opacity-95">
            <p className="text-center text-lg">
              Claim <span className="font-bold italic">your-alias-loogies.eth</span> ENS
            </p>
            <p className="text-center text-lg mt-0">
              Free and no gas fee required!
            </p>
          </div>
        </div>
        {showConfetti && <Confetti />}

        <div className="flex-grow w-full mt-8 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
            {address ? isLoadingMember ? (
              <div className="flex flex-row bg-base-300 px-10 py-10 text-center items-center place-content-center w-96 rounded-3xl text-2xl opacity-95">
                <svg className="animate-spin -ml-1 mr-4 h-5 w-5 text-white flex" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="flex">Loading...</p>
              </div>
            ) : isMember ? (
              <div className="flex flex-col bg-base-300 px-10 py-10 text-center items-center w-96 rounded-3xl text-2xl opacity-95">
                <Image alt="BuidlGuidl logo" src="/bg-logo-small.svg" width="50" height="50" />
                <p>
                  BuidlGuidl Member!
                </p>
                {isLoadingAlias ? (
                  <p>Loading current loogies.eth ENS alias...</p>
                ) : currentAlias ? (
                  <>
                    <p className="mb-0">Current alias:</p>
                    <p>{currentAlias || (<span className="underline text-slate-200">empty</span>)}.loogies.eth</p>

                    {changingAlias ? (
                      <>
                        <p className="mb-0">New alias:</p>
                        <div className="flex mb-8 mt-4"><InputBase value={newAlias} onChange={setNewAlias} />.loogies.eth</div>
                        <div>
                          <button className="btn btn-secondary mr-8" onClick={() => setChangingAlias(false)}>Cancel</button>
                          <button
                            className="btn btn-primary"
                            onClick={changeAlias}
                            disabled={updatingAlias || !newAlias || newAlias === currentAlias}
                          >
                            {updatingAlias && <svg className="animate-spin -ml-1 mr-4 h-5 w-5 text-white flex" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>}
                            Change alias
                          </button>
                        </div>
                      </>
                    ) : (
                      <p>
                        <button className="btn btn-primary" onClick={() => setChangingAlias(true)}>Change alias</button>
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="mb-0">Claim ENS</p>
                    <div className="flex mb-8 mt-4"><InputBase value={newAlias} onChange={setNewAlias} />.loogies.eth</div>
                    <div>
                      <button
                        className="btn btn-primary"
                        onClick={changeAlias}
                        disabled={updatingAlias || !newAlias || newAlias === currentAlias}
                      >
                        {updatingAlias && <svg className="animate-spin -ml-1 mr-4 h-5 w-5 text-white flex" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>}
                        Claim
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col bg-base-300 px-10 py-10 text-center items-center w-96 rounded-3xl text-2xl opacity-95">
                <Image alt="BuidlGuidl logo" className="opacity-60" src="/bg-logo-small-no.svg" width="50" height="69" />
                <p>
                  Not a BuidlGuidl Member
                </p>
              </div>
            ) : (
              <div className="flex flex-col bg-base-300 px-10 py-10 text-center items-center w-96 rounded-3xl text-2xl opacity-95">
                <SparklesIcon className="h-8 w-8 fill-secondary" />
                <p>
                  Connect your wallet to claim ENS name
                </p>
                <p>
                  <RainbowKitCustomConnectButton />
                </p>
              </div>
            )}
          </div>
        </div>
      </div >
    </>
  );
};

export default Home;
