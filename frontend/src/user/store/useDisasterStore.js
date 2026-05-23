import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useDisasterStore = create(
  persist(
    (set, get) => ({
      // Disaster nodes being reported
      disasterNodes: [],
      
      // Current editing node index
      editingIndex: null,
      
      // Request ID after submission
      requestId: null,
      
      // Submission status
      isSubmitting: false,
      submitError: null,

      // Actions
      addDisasterNode: (node) => {
        const nodeWithId = {
          ...node,
          id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          disasterNodes: [...state.disasterNodes, nodeWithId],
        }));
        return nodeWithId;
      },

      updateDisasterNode: (index, updates) => {
        set((state) => {
          const nodes = [...state.disasterNodes];
          if (nodes[index]) {
            nodes[index] = { ...nodes[index], ...updates };
          }
          return { disasterNodes: nodes };
        });
      },

      removeDisasterNode: (index) => {
        set((state) => ({
          disasterNodes: state.disasterNodes.filter((_, i) => i !== index),
          editingIndex: state.editingIndex === index ? null : state.editingIndex,
        }));
      },

      setEditingIndex: (index) => {
        set({ editingIndex: index });
      },

      clearEditingIndex: () => {
        set({ editingIndex: null });
      },

      setRequestId: (id) => {
        set({ requestId: id });
      },

      setSubmitting: (isSubmitting) => {
        set({ isSubmitting });
      },

      setSubmitError: (error) => {
        set({ submitError: error });
      },

      // Clear all nodes after successful submission
      clearDisasterNodes: () => {
        set({ disasterNodes: [], editingIndex: null });
      },

      // Reset entire store
      reset: () => {
        set({
          disasterNodes: [],
          editingIndex: null,
          requestId: null,
          isSubmitting: false,
          submitError: null,
        });
      },

      // Get node by index
      getNodeByIndex: (index) => {
        return get().disasterNodes[index];
      },

      // Get total lives impacted
      getTotalLivesImpacted: () => {
        return get().disasterNodes.reduce((sum, node) => sum + (node.livesImpacted || 0), 0);
      },

      // Get average severity
      getAverageSeverity: () => {
        const nodes = get().disasterNodes;
        if (nodes.length === 0) return 0;
        const total = nodes.reduce((sum, node) => sum + (node.severity || 0), 0);
        return Math.round(total / nodes.length);
      },
    }),
    {
      name: 'disaster-storage',
      partialize: (state) => ({
        disasterNodes: state.disasterNodes,
        requestId: state.requestId,
      }),
    }
  )
);

export default useDisasterStore;
