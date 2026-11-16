import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  userData: "",
  error: "",
  loading: false,
  token: "",
};

export const userReducer = createSlice({
  name: "userReducer",
  initialState,
  reducers: {
    userdataUpdate: (state, actions) => {
      // Redux Toolkit allows us to write "mutating" logic in reducers. It
      // doesn't actually mutate the state because it uses the Immer library,
      // which detects changes to a "draft state" and produces a brand new
      // immutable state based off those changes
      state.userData = actions.payload ? {...actions.payload, role:actions.payload.role || state.userData?.role} : '';
      state.error = "";
      state.loading = "";
      state.token = "";
    },
    logout: (state, actions) => {
      state.token = "";
      state.userData = "";
    },
  },
});

// Action creators are generated for each case reducer function
export const { userdataUpdate, logout } = userReducer.actions;

export default userReducer.reducer;
