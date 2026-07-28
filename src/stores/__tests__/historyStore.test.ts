import { useHistoryStore, Command } from '../historyStore';

describe('HistoryStore', () => {
  beforeEach(() => {
    useHistoryStore.getState().clear();
  });

  test('should push command to history', () => {
    const command: Command = {
      id: '1',
      type: 'updateField',
      field: 'name',
      oldValue: 'old',
      newValue: 'new',
      timestamp: Date.now(),
    };

    useHistoryStore.getState().push(command);

    expect(useHistoryStore.getState().past).toHaveLength(1);
    expect(useHistoryStore.getState().future).toHaveLength(0);
    expect(useHistoryStore.getState().canUndo()).toBe(true);
    expect(useHistoryStore.getState().canRedo()).toBe(false);
  });

  test('should undo command', () => {
    const command: Command = {
      id: '1',
      type: 'updateField',
      field: 'name',
      oldValue: 'old',
      newValue: 'new',
      timestamp: Date.now(),
    };

    useHistoryStore.getState().push(command);
    const undone = useHistoryStore.getState().undo();

    expect(undone).toEqual(command);
    expect(useHistoryStore.getState().past).toHaveLength(0);
    expect(useHistoryStore.getState().future).toHaveLength(1);
    expect(useHistoryStore.getState().canUndo()).toBe(false);
    expect(useHistoryStore.getState().canRedo()).toBe(true);
  });

  test('should redo command', () => {
    const command: Command = {
      id: '1',
      type: 'updateField',
      field: 'name',
      oldValue: 'old',
      newValue: 'new',
      timestamp: Date.now(),
    };

    useHistoryStore.getState().push(command);
    useHistoryStore.getState().undo();
    const redone = useHistoryStore.getState().redo();

    expect(redone).toEqual(command);
    expect(useHistoryStore.getState().past).toHaveLength(1);
    expect(useHistoryStore.getState().future).toHaveLength(0);
  });

  test('should limit history size', () => {
    // Push 60 commands (limit is 50)
    for (let i = 0; i < 60; i++) {
      useHistoryStore.getState().push({
        id: String(i),
        type: 'updateField',
        field: 'name',
        oldValue: `old${i}`,
        newValue: `new${i}`,
        timestamp: Date.now(),
      });
    }

    expect(useHistoryStore.getState().past).toHaveLength(50);
    expect(useHistoryStore.getState().past[0].id).toBe('10'); // First 10 should be dropped
  });

  test('should clear history', () => {
    useHistoryStore.getState().push({
      id: '1',
      type: 'updateField',
      field: 'name',
      oldValue: 'old',
      newValue: 'new',
      timestamp: Date.now(),
    });

    useHistoryStore.getState().clear();

    expect(useHistoryStore.getState().past).toHaveLength(0);
    expect(useHistoryStore.getState().future).toHaveLength(0);
    expect(useHistoryStore.getState().canUndo()).toBe(false);
    expect(useHistoryStore.getState().canRedo()).toBe(false);
  });
});
