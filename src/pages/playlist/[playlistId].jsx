import { useRouter } from "next/router";
import { useEffect } from "react";
import Link from "next/link";

const PlaylistPage = ({ playlist, currentlyPlayingTrackUri }) => {
  const router = useRouter();

  useEffect(() => {
    const playlistImage =
      playlist.images && playlist.images.length > 0
        ? playlist.images[0].url
        : "";
    localStorage.setItem("playlistPageImage", playlistImage);
  }, [playlist]);

  const playTrack = async (trackUri, trackIndex) => {
    const accessToken = router.query.accessToken;

    try {
      const devicesResponse = await fetch(
        "https://api.spotify.com/v1/me/player/devices",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const devicesData = await devicesResponse.json();

      if (devicesData.devices.length === 0) {
        console.error("No devices available for playback");
        return;
      }

      const device = devicesData.devices[0];
      const activeDeviceId = device.id;

      if (!device.is_active) {
        const transferResponse = await fetch(
          "https://api.spotify.com/v1/me/player",
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              device_ids: [activeDeviceId],
              play: false,
            }),
          }
        );

        if (!transferResponse.ok) {
          const errorData = await transferResponse.json();
          console.error("Error transferring playback:", errorData);
          return;
        }
      }

      const trackUris = playlist.tracks.items.map((item) => item.track.uri);

      const playResponse = await fetch(
        "https://api.spotify.com/v1/me/player/play",
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uris: trackUris,
            offset: {
              position: trackIndex,
            },
            device_id: activeDeviceId,
          }),
        }
      );

      if (!playResponse.ok) {
        const errorData = await playResponse.json();
        console.error("Error playing track:", errorData);
      }
    } catch (error) {
      console.error("Error with playTrack request:", error);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 pt-10 px-12 max-h-screen">
      <div className="md:w-1/3 h-screen sticky top-0">
        {playlist.images && playlist.images.length > 0 ? (
          <>
            <div className="min-w-[280px] mr-10">
              <img
                src={playlist.images[0].url}
                alt="Playlist Cover"
                className="w-[280px] h-[280px] aspect-square rounded-[12px] drop-shadow-xl"
              />
              <h4 className="mt-2 text-[36px] font-medium text-white truncate tracking-tight max-w-[280px]">
                {playlist.name}
              </h4>
              <h4 className="text-[28px] font-normal text-white/60 truncate tracking-tight max-w-[280px]">
                {playlist.tracks.total.toLocaleString()} Songs
              </h4>
            </div>
          </>
        ) : (
          <p>No image available</p>
        )}
      </div>

      <div className="md:w-2/3 ml-20 h-screen overflow-y-scroll scroll-container pb-12">
        {playlist.tracks && playlist.tracks.items ? (
          playlist.tracks.items.map((track, index) => (
            <Link key={track.track.id} href={`/now-playing`}>
              <div
                onClick={() => playTrack(track.track.uri, index)}
                className="flex gap-6 items-start mb-4"
              >
                <div className="text-[32px] font-medium text-white/60 w-6 mt-3">
                  {track.track.uri === currentlyPlayingTrackUri ? (
                    <div className="w-5">
                      <section>
                        <div className="wave0"></div>
                        <div className="wave1"></div>
                        <div className="wave2"></div>
                        <div className="wave3"></div>
                      </section>
                    </div>
                  ) : (
                    <p>{index + 1}</p>
                  )}
                </div>

                <div>
                  <p className="text-[32px] font-normal text-white truncate tracking-tight max-w-[280px]">
                    {track.track.name}
                  </p>
                  <p className="text-[28px] font-light text-white/60 truncate tracking-tight max-w-[280px]">
                    {track.track.artists
                      .map((artist) => artist.name)
                      .join(", ")}
                  </p>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <p>No tracks available</p>
        )}
      </div>
    </div>
  );
};

export async function getServerSideProps(context) {
  const { playlistId } = context.params;
  const accessToken = context.query.accessToken;

  const res = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const errorData = await res.json();
    console.error("Error fetching playlist:", errorData);
    return {
      notFound: true,
    };
  }

  const playlistData = await res.json();

  const tracksRes = await fetch(playlistData.tracks.href, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const tracksData = await tracksRes.json();

  return {
    props: {
      playlist: { ...playlistData, tracks: tracksData },
    },
  };
}

export default PlaylistPage;
