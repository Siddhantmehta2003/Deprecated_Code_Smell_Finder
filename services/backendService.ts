
const BACKEND_URL = 'http://localhost:8000';

export interface ScanResponse {
  success: boolean;
  context: string;
  message: string;
}

const MOCK_REPO_CONTEXT = `
// ==========================================
// SIMULATED REPOSITORY SCAN (DEMO MODE)
// Backend connection failed, showing sample data
// ==========================================

// File: src/components/UserCard.js
import React, { Component } from 'react';
import PropTypes from 'prop-types';

// DEPRECATED: 'request' library is deprecated and unmaintained
import request from 'request';

class UserCard extends Component {
  // DEPRECATED: Legacy Lifecycle Method (React 16.3+)
  componentWillMount() {
    console.log('Component is about to mount...');
    this.fetchData();
  }

  // DEPRECATED: String Refs
  componentDidMount() {
    this.refs.headerInput.focus();
  }

  fetchData() {
    // SECURITY: Hardcoded credentials
    const apiKey = "12345-abcde-secret-key";
    
    request.get('https://api.example.com/user', (err, res, body) => {
       if (err) console.error(err);
    });
  }

  render() {
    return (
      <div className="user-card">
         {/* DEPRECATED: javascript: void href */}
         <a href="javascript:void(0)" onClick={this.props.onClick}>
           View Profile
         </a>
         
         <input type="text" ref="headerInput" />
         
         {/* PREDICTION: Class Components are stagnant in modern React */}
         <span>{this.props.name}</span>
      </div>
    );
  }
}

// File: src/utils/fileSystem.js
const fs = require('fs');

function checkConfig() {
  // DEPRECATED: fs.exists is deprecated
  fs.exists('./config.json', (exists) => {
    console.log(exists ? 'Config found' : 'No config');
  });
}

// File: package.json
/*
{
  "dependencies": {
    "react": "16.8.0",
    "request": "2.88.2",
    "moment": "2.24.0" 
  }
}
*/
`;

export const scanGitRepo = async (url: string): Promise<ScanResponse> => {
  try {
    const response = await fetch(`${BACKEND_URL}/scan-repo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to scan repository');
    }

    return await response.json();
  } catch (error: any) {
    console.warn('Backend connection failed. Switching to Simulation Mode.', error);
    
    // Fallback for Demo/Preview environment
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                message: "Backend unreachable. Loaded SIMULATED repository for demonstration.",
                context: MOCK_REPO_CONTEXT
            });
        }, 1500); // Simulate network delay
    });
  }
};

export const scanLocalPath = async (path: string): Promise<ScanResponse> => {
  try {
    const response = await fetch(`${BACKEND_URL}/scan-local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to scan local path');
    }

    return await response.json();
  } catch (error: any) {
    console.warn('Backend connection failed. Switching to Simulation Mode.', error);
    
    // Fallback for Demo/Preview environment
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                message: "Backend unreachable. Loaded SIMULATED local files for demonstration.",
                context: MOCK_REPO_CONTEXT
            });
        }, 1000);
    });
  }
};
