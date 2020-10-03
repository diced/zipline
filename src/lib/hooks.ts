import createPersistedState from 'use-persisted-state';
const useLoggedInState = createPersistedState('loggedIn');
const useUsernameState = createPersistedState('username');

export const useLogin = (initialValue: boolean) => {
  const [loggedIn, setloggedIn] = useLoggedInState(initialValue);

  return {
    loggedIn,
    login: () => setloggedIn(true),
    logout: () => setloggedIn(false),
  };
};

export const useName = (initialValue: string) => {
  const [username, setUsername] = useUsernameState(initialValue);

  return {
    username,
    name: (d: string) => setUsername(d),
  };
};