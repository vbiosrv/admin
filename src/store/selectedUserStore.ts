import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  user_id: number;
  email?: string;
  name?: string;
  login?: string;
  full_name?: string;
  [key: string]: any;
}

interface SelectedUserState {
  selectedUser: User | null;
  selectedUsers: Array<{id: string, user: User}>;
  activeUserId: string | null;
  setSelectedUser: (user: User | null) => void;
  addSelectedUser: (user: User) => void;
  removeSelectedUser: (id: string) => void;
  setActiveUser: (id: string) => void;
  clearSelectedUser: () => void;
  clearAllSelectedUsers: () => void;
}

export const useSelectedUserStore = create<SelectedUserState>()(
  persist(
    (set, get) => ({
      selectedUser: null,
      selectedUsers: [],
      activeUserId: null,

      setSelectedUser: (user) => set({ selectedUser: user }),

      addSelectedUser: (user) => set((state) => {
        const id = `user-${user.user_id}`;
        const existingIndex = state.selectedUsers.findIndex(u => u.id === id);

        if (existingIndex !== -1) {
          // Если пользователь уже есть, просто делаем его активным
          return {
            activeUserId: id,
            selectedUser: user
          };
        } else {
          // Добавляем нового пользователя
          const newUsers = [...state.selectedUsers, { id, user }];
          return {
            selectedUsers: newUsers,
            activeUserId: id,
            selectedUser: user
          };
        }
      }),

      removeSelectedUser: (id) => set((state) => {
        const newUsers = state.selectedUsers.filter(u => u.id !== id);
        let newActiveUserId = state.activeUserId;
        let newSelectedUser = state.selectedUser;

        if (state.activeUserId === id && newUsers.length > 0) {
          const newActiveUserItem = newUsers[newUsers.length - 1];
          newActiveUserId = newActiveUserItem.id;
          newSelectedUser = newActiveUserItem.user;
        } else if (newUsers.length === 0) {
          newActiveUserId = null;
          newSelectedUser = null;
        }

        return {
          selectedUsers: newUsers,
          activeUserId: newActiveUserId,
          selectedUser: newSelectedUser
        };
      }),

      setActiveUser: (id) => set((state) => {
        const activeUserItem = state.selectedUsers.find(u => u.id === id);
        return {
          activeUserId: id,
          selectedUser: activeUserItem ? activeUserItem.user : null
        };
      }),

      clearSelectedUser: () => set({ selectedUser: null }),

      clearAllSelectedUsers: () => set({
        selectedUsers: [],
        activeUserId: null,
        selectedUser: null
      }),
    }),
    {
      name: 'selected-user-storage',
    }
  )
);
