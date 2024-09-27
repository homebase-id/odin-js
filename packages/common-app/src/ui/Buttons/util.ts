export type ActionButtonState = 'pending' | 'loading' | 'success' | 'error' | 'idle';

export const mergeStates = (
  stateA: ActionButtonState,
  stateB: ActionButtonState
): ActionButtonState => {
  if (stateA === 'error' || stateB === 'error') return 'error';
  if (stateA === 'pending' || stateB === 'pending') return 'pending';
  if (stateA === 'loading' || stateB === 'loading') return 'loading';
  if (stateA === 'idle' && stateB === 'idle') return 'idle';
  if (stateA === 'success' && stateB === 'success') return 'success';
  if ((stateA === 'success' && stateB === 'idle') || (stateA === 'idle' && stateB === 'success'))
    return 'success';

  return 'idle';
};
