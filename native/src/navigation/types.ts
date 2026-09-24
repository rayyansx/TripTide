export type AuthStackParamList = {
  Login: undefined;
};

export type AppStackParamList = {
  Dashboard: undefined;
  Trip: { tripId: number; title: string };
  Settings: undefined;
};
