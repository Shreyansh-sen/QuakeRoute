import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAdminStore = create(
  persist(
    (set, get) => ({
      // Dashboard stats
      dashboardStats: null,
      chartData: null,
      
      // Disasters list
      disasters: [],
      disastersPagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      
      // Filters
      filters: {
        status: '',
        type: '',
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
      
      // Selected disaster for allocation
      selectedDisaster: null,
      
      // Available resources for allocation
      availableResources: [],
      
      // Allocation inputs (resourceId -> { assets, humans })
      allocationInputs: {},
      
      // Selected resources for allocation
      selectedResourceIds: [],
      
      // Loading states
      isLoadingStats: false,
      isLoadingDisasters: false,
      isLoadingResources: false,
      isSubmittingAllocation: false,

      // ============================================
      // NEW STATE FOR DISASTER CREATION FLOW
      // ============================================
      
      // Created disaster response
      createdDisasterResponse: null,
      
      // List disasters response (paginated)
      listDisastersResponse: null,
      
      // Discover resources response
      discoverResourcesResponse: null,
      
      // Last created disaster IDs
      lastCreatedDisasterIds: [],
      
      // Loading state for disaster creation flow
      isCreatingDisaster: false,

      // Actions for disaster creation flow
      setCreatedDisasterResponse: (response) => {
        set({ createdDisasterResponse: response });
      },

      setListDisastersResponse: (response) => {
        set({ listDisastersResponse: response });
      },

      setDiscoverResourcesResponse: (response) => {
        set({ discoverResourcesResponse: response });
      },

      setLastCreatedDisasterIds: (ids) => {
        set({ lastCreatedDisasterIds: ids });
      },

      setCreatingDisaster: (loading) => {
        set({ isCreatingDisaster: loading });
      },

      // Combined action to set all disaster creation flow responses
      setDisasterCreationFlowResponses: ({ createDisaster, listDisasters, discoverResources, disasterIds }) => {
        set({
          createdDisasterResponse: createDisaster,
          listDisastersResponse: listDisasters,
          discoverResourcesResponse: discoverResources,
          lastCreatedDisasterIds: disasterIds,
        });
      },

      // Clear disaster creation flow responses
      clearDisasterCreationFlowResponses: () => {
        set({
          createdDisasterResponse: null,
          listDisastersResponse: null,
          discoverResourcesResponse: null,
          lastCreatedDisasterIds: [],
        });
      },

      // ============================================
      // EXISTING ACTIONS
      // ============================================

      // Actions
      setDashboardStats: (stats) => {
        set({ dashboardStats: stats });
      },

      setChartData: (data) => {
        set({ chartData: data });
      },

      setDisasters: (disasters, pagination) => {
        set({ 
          disasters, 
          disastersPagination: pagination || get().disastersPagination,
        });
      },

      setFilters: (filters) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      resetFilters: () => {
        set({
          filters: {
            status: '',
            type: '',
            search: '',
            sortBy: 'createdAt',
            sortOrder: 'desc',
          },
        });
      },

      setSelectedDisaster: (disaster) => {
        set({ selectedDisaster: disaster });
      },

      setAvailableResources: (resources) => {
        set({ availableResources: resources });
      },

      // Allocation inputs management
      setAllocationInput: (resourceId, field, value) => {
        set((state) => ({
          allocationInputs: {
            ...state.allocationInputs,
            [resourceId]: {
              ...state.allocationInputs[resourceId],
              [field]: value,
            },
          },
        }));
      },

      getAllocationInput: (resourceId) => {
        return get().allocationInputs[resourceId] || { assets: 0, humans: 0 };
      },

      clearAllocationInputs: () => {
        set({ allocationInputs: {}, selectedResourceIds: [] });
      },

      // Selected resources
      toggleResourceSelection: (resourceId) => {
        set((state) => {
          const isSelected = state.selectedResourceIds.includes(resourceId);
          if (isSelected) {
            return {
              selectedResourceIds: state.selectedResourceIds.filter((id) => id !== resourceId),
            };
          } else {
            return {
              selectedResourceIds: [...state.selectedResourceIds, resourceId],
            };
          }
        });
      },

      isResourceSelected: (resourceId) => {
        return get().selectedResourceIds.includes(resourceId);
      },

      // Build allocation payload
      buildAllocationPayload: () => {
        const { selectedDisaster, selectedResourceIds, allocationInputs } = get();
        
        if (!selectedDisaster) return null;

        const allocations = selectedResourceIds
          .map((resourceId) => ({
            resourceId,
            assets: allocationInputs[resourceId]?.assets || 0,
            humans: allocationInputs[resourceId]?.humans || 0,
          }))
          .filter((a) => a.assets > 0 || a.humans > 0);

        return {
          requestId: selectedDisaster.id,
          allocations,
        };
      },

      // Loading states
      setLoadingStats: (loading) => set({ isLoadingStats: loading }),
      setLoadingDisasters: (loading) => set({ isLoadingDisasters: loading }),
      setLoadingResources: (loading) => set({ isLoadingResources: loading }),
      setSubmittingAllocation: (loading) => set({ isSubmittingAllocation: loading }),

      // Reset store
      reset: () => {
        set({
          dashboardStats: null,
          chartData: null,
          disasters: [],
          disastersPagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
          filters: {
            status: '',
            type: '',
            search: '',
            sortBy: 'createdAt',
            sortOrder: 'desc',
          },
          selectedDisaster: null,
          availableResources: [],
          allocationInputs: {},
          selectedResourceIds: [],
          // Reset disaster creation flow state
          createdDisasterResponse: null,
          listDisastersResponse: null,
          discoverResourcesResponse: null,
          lastCreatedDisasterIds: [],
          isCreatingDisaster: false,
        });
      },
    }),
    {
      name: 'admin-storage',
      partialize: (state) => ({
        filters: state.filters,
      }),
    }
  )
);

export default useAdminStore;
