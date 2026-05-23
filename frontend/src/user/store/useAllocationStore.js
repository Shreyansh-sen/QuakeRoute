import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAllocationStore = create(
  persist(
    (set, get) => ({
      // Current allocation tracking
      currentRequestId: null,
      currentStage: 1,
      currentStatus: 'Disaster Registered',
      progress: 0,
      isComplete: false,
      
      // Resource allocations
      allocatedResources: [],
      
      // Connection data for map visualization
      connections: [],
      
      // Polling status
      isPolling: false,
      lastUpdated: null,

      // Actions
      setCurrentRequest: (requestId) => {
        set({
          currentRequestId: requestId,
          currentStage: 1,
          currentStatus: 'Disaster Registered',
          progress: 0,
          isComplete: false,
          lastUpdated: new Date().toISOString(),
        });
      },

      updateAllocationStatus: (statusData) => {
        set({
          currentStage: statusData.stage,
          currentStatus: statusData.status,
          progress: statusData.progress,
          isComplete: statusData.isComplete || statusData.stage === 7,
          lastUpdated: new Date().toISOString(),
        });
      },

      setAllocatedResources: (resources) => {
        set({ allocatedResources: resources });
      },

      addConnection: (connection) => {
        set((state) => ({
          connections: [...state.connections, connection],
        }));
      },

      setConnections: (connections) => {
        set({ connections });
      },

      setPolling: (isPolling) => {
        set({ isPolling });
      },

      // Get stage details
      getStageDetails: () => {
        const { currentStage, currentStatus, progress, isComplete } = get();
        return { stage: currentStage, status: currentStatus, progress, isComplete };
      },

      // Reset store
      reset: () => {
        set({
          currentRequestId: null,
          currentStage: 1,
          currentStatus: 'Disaster Registered',
          progress: 0,
          isComplete: false,
          allocatedResources: [],
          connections: [],
          isPolling: false,
          lastUpdated: null,
        });
      },
    }),
    {
      name: 'allocation-storage',
      partialize: (state) => ({
        currentRequestId: state.currentRequestId,
        currentStage: state.currentStage,
        currentStatus: state.currentStatus,
        progress: state.progress,
        isComplete: state.isComplete,
        allocatedResources: state.allocatedResources,
      }),
    }
  )
);

export default useAllocationStore;
