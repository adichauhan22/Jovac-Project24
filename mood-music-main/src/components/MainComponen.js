import axios from "axios";
import SongCard from "./SongCard";
import * as faceapi from "face-api.js";
import WebcamModal from "./WebcamModal"; 
import { Bars } from "react-loader-spinner";
import { styled } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import './MainComponent.css'
import React, { useState, useEffect, useCallback } from "react";
import {
  Button,
  Box,
  Paper,
  Grid,
  Drawer,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu"; // Importing Menu icon

var geolocation = require("geolocation");

const Item = styled(Paper)(({ theme }) => ({
  ...theme.typography.body2,
  textAlign: "center",
  color: theme.palette.text.secondary,
  borderRadius: "10px",
}));

const UserProfile = styled(Box)(({ theme }) => ({
  width: "50px",
  height: "50px",
  borderRadius: "50%",
  backgroundColor: theme.palette.grey[300],
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "16px",
}));


function MainComponent() {
  const [loader, setShowLoader] = useState(false);
  const [songs, setSongs] = useState([]);
  const [showSongs, setShowSongs] = useState(false);
  const [webcamModal, setWebcamModal] = useState(false);
  const [emotion, setEmotion] = useState();
  const [weather, setWeather] = useState();
  const [location, setLocation] = useState();
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [currentAudio, setCurrentAudio] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState("black");
  const navigate = useNavigate();

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = process.env.PUBLIC_URL + "/models";

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
    };

    if (!modelsLoaded) loadModels();

    if (!location) {
      geolocation.getCurrentPosition(function (err, position) {
        if (err) throw err;
        setLocation(position.coords.latitude + "," + position.coords.longitude);
      });
    }

    if (location) {
      axios
        .get(
          `https://api.weatherapi.com/v1/current.json?key=${process.env.REACT_APP_WEATHER_API_KEY}&q=${location}&aqi=no`
        )
        .then((response) => {
          setWeather(response.data.current.condition.text);
        });
    }

    const fetchAccessToken = async () => {
      const clientId = "39798627b39140e48b95e681d88151c4";
      const clientSecret = "e876cc99129448b8adda0b371473069a";

      const tokenUrl = "https://accounts.spotify.com/api/token";
      const body = new URLSearchParams({
        grant_type: "client_credentials",
      });

      const headers = {
        Authorization: `Basic ${btoa(clientId + ":" + clientSecret)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      };

      try {
        const response = await axios.post(tokenUrl, body, { headers });
        setAccessToken(response.data.access_token);
      } catch (error) {
        console.error("Failed to fetch Spotify access token:", error);
      }
    };

    fetchAccessToken();
  }, [location, modelsLoaded]);

  const recommendSongs = useCallback(
    (mood) => {
      setEmotion(mood);
      setShowLoader(true);
      setShowSongs(true);

      // Set background color based on mood
      const moodToColor = {
        Happy: "yellow",
        Sad: "blue",
        Surprised: "orange",
        Fearful: "purple",
        Angry: "red",
        Disgusted: "green",
        Neutral: "grey",
      };

      setBackgroundColor(moodToColor[mood] || "black");

      if (!weather) {
        alert("Detecting weather...");
        return;
      }

      if (!accessToken) {
        console.error("Spotify access token is missing.");
        return;
      }

      const moodToPlaylist = {
        Happy: "4nNVfQ9eWidZXkBKZN5li4", // Example playlist ID for Bollywood
        Sad: "37i9dQZF1DXdFesNN9TzXT", // Example playlist ID for Hindi Sad Songs
        Surprised: "37i9dQZF1DX0XUfTFmNBRM", // Example playlist ID for Hindi Surprise Mood
        Fearful: "08eWe5qrfPRCH4V7P69KRs", // Example playlist ID for Hindi Fearful Mood
        Angry: "3JNWpteYvH3ynMcyPcvxfx", // Example playlist ID for Hindi Angry Mood
        Disgusted: "0EDTgQrMbfS7RGToucSGoK", // Example playlist ID for Hindi Disgust Mood
        Neutral: "1b6Lj2j6z1cUg2WWsuGGk0", // Example playlist ID for Hindi Neutral Mood
      };

      const playlistId = moodToPlaylist[mood];

      axios
        .get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            market: "IN",
            limit: 50,
          },
        })
        .then((response) => {
          setShowLoader(false);
          setSongs(
            response.data.items
              .map((item) => item.track)
              .filter((track) => track.preview_url)
          );
        })
        .catch((error) => {
          setShowLoader(false);
          console.error("Error fetching recommendations from Spotify:", error);
        });
    },
    [weather, accessToken]
  );

  useEffect(() => {
    if (emotion) {
      recommendSongs(emotion);
    }
  }, [emotion, recommendSongs]);

  const handleSongPlay = (previewUrl) => {
    if (currentAudio) {
      currentAudio.pause(); // Pause the currently playing song
    }

    const audio = new Audio(previewUrl);
    audio.play();
    setCurrentAudio(audio);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogout = () => {
    // Clear any tokens or relevant state
    setAccessToken("");
    setEmotion(null);
    setSongs([]);
    setShowSongs(false);
    // Redirect to the front page
    navigate("/"); // Change to the path of your front page
  };

  return (
    <div style={{ textAlign: "center", backgroundColor: backgroundColor, minHeight: "100vh", overflow: "hidden" }}>
      <h1 style={{ color: "white" }}>Mood Tunes</h1>

      <IconButton onClick={toggleSidebar} style={{ color: "white", position: "absolute", top: "16px", left: "16px", zIndex: 1000 }}>
        <MenuIcon />
      </IconButton>

      <Drawer anchor="left" open={sidebarOpen} onClose={toggleSidebar}>
        <Box
          sx={{ width: 250 }}
          role="presentation"
          onClick={toggleSidebar}
          onKeyDown={toggleSidebar}
        >
          <UserProfile><img  id="userprofile" width="50px" height="50px"  src="https://cdn.pixabay.com/photo/2019/10/10/18/51/smartphone-4540273_1280.jpg" alt="User"></img> </UserProfile>
          <List>
            {["Happy", "Sad", "Surprised", "Fearful", "Angry", "Disgusted", "Neutral"].map((mood) => (
              <ListItem button key={mood} onClick={() => recommendSongs(mood)}>
                <ListItemText primary={mood} />
              </ListItem>
            ))}
          <ListItem button onClick={handleLogout}>
            <ListItemText primary="Logout" />
          </ListItem>
          </List>
          
        </Box>
      </Drawer>

      <Button variant="contained" onClick={() => setWebcamModal(true)} style={{ marginTop: "20px" }}>
        Play my mood!
      </Button>

      {webcamModal && (
        <WebcamModal
          webcamModal={webcamModal}
          closeWebcamModal={() => setWebcamModal(false)}
          setEmotion={setEmotion}
          modelsLoaded={modelsLoaded}
        />
      )}

      <div style={{ marginTop: "20px" }}>
        {emotion && <div style={{ color: "white" }}>Mood: {emotion}</div>}
        {weather && <div style={{ color: "white" }}>Weather: {weather}</div>}
        {loader ? (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              height: "100px",
            }}
          >
            <Bars color="white" />
          </div>
        ) : (
          <Grid container spacing={2} style={{ padding: "20px" }}>
            {songs.map((song) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={song.id}>
                <Item>
                  <SongCard
                    song={song}
                    onPlay={() => handleSongPlay(song.preview_url)}
                  />
                </Item>
              </Grid>
            ))}
          </Grid>
        )}
      </div>
    </div>
  );
}

export default MainComponent;

