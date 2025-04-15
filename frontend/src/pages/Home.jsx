import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

import withAuth from '../utils/withAuth';
import { AuthContext } from '../contexts/AuthContext';

import { Button, IconButton, TextField, Typography, Snackbar, Alert } from '@mui/material';
import { Restore } from '@mui/icons-material';

import "../App.css";

function HomeComponent() {
  const navigate = useNavigate();
  const [meetingCode, setMeetingCode] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const { addToUserHistory } = useContext(AuthContext);

  const handleJoinVideoCall = async () => {
    if (!meetingCode.trim()) {
      return setSnackbar({ open: true, message: "Please enter a valid meeting code", severity: 'warning' });
    }

    await addToUserHistory(meetingCode);
    navigate(`/${meetingCode}`);
  };

  const handleCreateMeeting = () => {
    const newMeetingId = uuidv4();
    navigate(`/${newMeetingId}`);
    setSnackbar({
      open: true,
      message: `Meeting created: ${window.location.origin}/${newMeetingId} (copied!)`,
      severity: 'success',
    });
    navigator.clipboard.writeText(`${window.location.origin}/${newMeetingId}`);
  };

  return (
    <>
      <div className='navBar'>
        <div style={{ display: "flex", alignItems: "center" }}>
          <h2>Video Call</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <IconButton onClick={() => navigate("/history")}>
            <Restore />
            History
          </IconButton>
          <Button
            onClick={() => {
              localStorage.removeItem("token");
              navigate("/auth");
            }}
            style={{ padding: "1rem" }}
          >
            Logout
          </Button>
        </div>
      </div>

      <div className="meetContainer">
        <div className="leftPanel">
          <div>
            <Typography variant="h5" gutterBottom>
              Providing Quality Video Call
            </Typography>
            <div style={{ display: "flex", gap: '10px', marginTop: "15px" }}>
              <TextField
                value={meetingCode}
                onChange={(e) => setMeetingCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleJoinVideoCall();
                  }
                }}
                label="Meeting Code"
                variant="outlined"
              />
              <Button onClick={handleJoinVideoCall} variant="contained">
                Join
              </Button>
            </div>

            <Typography variant="body2" style={{ margin: "15px 0", textAlign: "center" }}>
              — OR —
            </Typography>

            <Button onClick={handleCreateMeeting} variant="outlined">
              Create New Meeting
            </Button>
          </div>
        </div>

        <div className="rightPanel">
          <img srcSet="/logo3.png" alt="video call logo" />
        </div>
      </div>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default withAuth(HomeComponent);
