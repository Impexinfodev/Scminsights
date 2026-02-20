"use client";

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface UserData {
  user_id: string;
  name?: string;
  session_token: string;
  session_expiration_time: string;
  user_details?: {
    Name?: string;
    Email?: string;
    CompanyName?: string;
    PhoneNumber?: string;
    Role?: string;
  };
}

interface AuthState {
  isLoggedIn: boolean;
  user: UserData | null;
  isLoading: boolean;
  sessionChecked: boolean;
}

const initialState: AuthState = {
  isLoggedIn: false,
  user: null,
  isLoading: true,
  sessionChecked: false,
};

// Helper function to check if session is expired
const isSessionExpired = (expirationTime: string | undefined): boolean => {
  if (!expirationTime) return true;
  
  try {
    const expTime = new Date(expirationTime).getTime();
    const currentTime = Date.now();
    // Add 1 minute buffer
    return currentTime >= expTime - 60000;
  } catch {
    return true;
  }
};

// Helper function to validate and parse session from localStorage
const getValidSession = (): UserData | null => {
  if (typeof window === "undefined") return null;
  
  try {
    const sessionStr = localStorage.getItem("session");
    if (!sessionStr) return null;
    
    const session = JSON.parse(sessionStr) as UserData;
    
    // Check required fields
    if (!session.session_token || !session.session_expiration_time) {
      return null;
    }
    
    // Check if expired
    if (isSessionExpired(session.session_expiration_time)) {
      // Clear expired session
      localStorage.removeItem("session");
      localStorage.removeItem("session_token");
      return null;
    }
    
    return session;
  } catch {
    // Clear invalid session
    localStorage.removeItem("session");
    localStorage.removeItem("session_token");
    return null;
  }
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Initialize auth state from localStorage
    initializeAuth: (state) => {
      const validSession = getValidSession();
      
      if (validSession) {
        state.isLoggedIn = true;
        state.user = validSession;
      } else {
        state.isLoggedIn = false;
        state.user = null;
      }
      
      state.isLoading = false;
      state.sessionChecked = true;
    },
    
    // Login action
    login: (state, action: PayloadAction<UserData>) => {
      const userData = action.payload;
      
      // Validate session before setting
      if (!isSessionExpired(userData.session_expiration_time)) {
        state.isLoggedIn = true;
        state.user = userData;
        
        // Save to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("session", JSON.stringify(userData));
          localStorage.setItem("session_token", userData.session_token);
        }
      }
      
      state.isLoading = false;
      state.sessionChecked = true;
    },
    
    // Logout action
    logout: (state) => {
      state.isLoggedIn = false;
      state.user = null;
      state.isLoading = false;
      
      // Clear localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("session");
        localStorage.removeItem("session_token");
      }
    },
    
    // Check and validate session
    validateSession: (state) => {
      if (state.user) {
        if (isSessionExpired(state.user.session_expiration_time)) {
          // Session expired
          state.isLoggedIn = false;
          state.user = null;
          
          // Clear localStorage
          if (typeof window !== "undefined") {
            localStorage.removeItem("session");
            localStorage.removeItem("session_token");
          }
        }
      }
    },
    
    // Update user data
    updateUser: (state, action: PayloadAction<Partial<UserData>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        
        // Update localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("session", JSON.stringify(state.user));
        }
      }
    },
    
    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const {
  initializeAuth,
  login,
  logout,
  validateSession,
  updateUser,
  setLoading,
} = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectIsLoggedIn = (state: { auth: AuthState }) => state.auth.isLoggedIn;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectSessionChecked = (state: { auth: AuthState }) => state.auth.sessionChecked;
