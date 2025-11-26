/**
 * Step tracker tests - ported from test_step_tracker.py
 */
import { describe, it, expect, vi } from 'vitest';
import { StepTracker } from '../../../src/lib/ui/tracker.js';

describe('StepTracker initialization', () => {
  // test_init_accepts_title
  it('should accept and store title', () => {
    const tracker = new StepTracker('My Title');
    expect(tracker.title).toBe('My Title');
  });

  // test_init_steps_empty
  it('should start with empty steps array', () => {
    const tracker = new StepTracker('Title');
    expect(tracker.steps).toEqual([]);
  });

  // test_status_order_defined
  it('should have 5 status values defined', () => {
    const tracker = new StepTracker('Title');
    expect(Object.keys(tracker.statusOrder)).toHaveLength(5);
    expect(tracker.statusOrder).toHaveProperty('pending');
    expect(tracker.statusOrder).toHaveProperty('running');
    expect(tracker.statusOrder).toHaveProperty('done');
    expect(tracker.statusOrder).toHaveProperty('error');
    expect(tracker.statusOrder).toHaveProperty('skipped');
  });
});

describe('StepTracker.add', () => {
  // test_add_creates_step
  it('should create step with correct structure', () => {
    const tracker = new StepTracker('Title');
    tracker.add('step1', 'Step One');
    expect(tracker.steps).toHaveLength(1);
    expect(tracker.steps[0]).toEqual({
      key: 'step1',
      label: 'Step One',
      status: 'pending',
      detail: '',
    });
  });

  // test_add_same_key_noop
  it('should not add duplicate keys', () => {
    const tracker = new StepTracker('Title');
    tracker.add('step1', 'Step One');
    tracker.add('step1', 'Different Label');
    expect(tracker.steps).toHaveLength(1);
    expect(tracker.steps[0]?.label).toBe('Step One');
  });

  // test_add_maintains_order
  it('should maintain insertion order', () => {
    const tracker = new StepTracker('Title');
    tracker.add('first', 'First');
    tracker.add('second', 'Second');
    tracker.add('third', 'Third');
    expect(tracker.steps.map((s) => s.key)).toEqual(['first', 'second', 'third']);
  });
});

describe('StepTracker status updates', () => {
  // test_start_sets_running
  it('should set status to running on start', () => {
    const tracker = new StepTracker('Title');
    tracker.add('step1', 'Step One');
    tracker.start('step1');
    expect(tracker.steps[0]?.status).toBe('running');
  });

  // test_complete_sets_done
  it('should set status to done on complete', () => {
    const tracker = new StepTracker('Title');
    tracker.add('step1', 'Step One');
    tracker.complete('step1');
    expect(tracker.steps[0]?.status).toBe('done');
  });

  // test_error_sets_error
  it('should set status to error on error', () => {
    const tracker = new StepTracker('Title');
    tracker.add('step1', 'Step One');
    tracker.error('step1');
    expect(tracker.steps[0]?.status).toBe('error');
  });

  // test_skip_sets_skipped
  it('should set status to skipped on skip', () => {
    const tracker = new StepTracker('Title');
    tracker.add('step1', 'Step One');
    tracker.skip('step1');
    expect(tracker.steps[0]?.status).toBe('skipped');
  });

  // test_start_with_detail
  it('should set detail when starting', () => {
    const tracker = new StepTracker('Title');
    tracker.add('step1', 'Step One');
    tracker.start('step1', 'in progress');
    expect(tracker.steps[0]?.detail).toBe('in progress');
  });

  // test_complete_with_detail
  it('should set detail when completing', () => {
    const tracker = new StepTracker('Title');
    tracker.add('step1', 'Step One');
    tracker.complete('step1', 'finished successfully');
    expect(tracker.steps[0]?.detail).toBe('finished successfully');
  });

  // test_update_creates_if_missing
  it('should auto-create step if updating non-existent key', () => {
    const tracker = new StepTracker('Title');
    tracker.complete('new-step', 'auto created');
    expect(tracker.steps).toHaveLength(1);
    expect(tracker.steps[0]).toEqual({
      key: 'new-step',
      label: 'new-step', // Uses key as label
      status: 'done',
      detail: 'auto created',
    });
  });
});

describe('StepTracker refresh callback', () => {
  // test_attach_refresh_stores_callback
  it('should store refresh callback', () => {
    const tracker = new StepTracker('Title');
    const callback = vi.fn();
    tracker.attachRefresh(callback);
    // Verify callback is stored by triggering it
    tracker.add('step1', 'Step');
    expect(callback).toHaveBeenCalled();
  });

  // test_callback_triggered_on_add
  it('should trigger callback on add', () => {
    const tracker = new StepTracker('Title');
    const callback = vi.fn();
    tracker.attachRefresh(callback);
    tracker.add('step1', 'Step');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  // test_callback_triggered_on_status_change
  it('should trigger callback on status change', () => {
    const tracker = new StepTracker('Title');
    tracker.add('step1', 'Step');
    const callback = vi.fn();
    tracker.attachRefresh(callback);
    tracker.start('step1');
    expect(callback).toHaveBeenCalledTimes(1);
    tracker.complete('step1');
    expect(callback).toHaveBeenCalledTimes(2);
  });

  // test_callback_exception_ignored
  it('should ignore callback exceptions', () => {
    const tracker = new StepTracker('Title');
    const callback = vi.fn().mockImplementation(() => {
      throw new Error('Callback error');
    });
    tracker.attachRefresh(callback);
    // Should not throw
    expect(() => tracker.add('step1', 'Step')).not.toThrow();
  });
});

describe('StepTracker.render', () => {
  // test_render_returns_string
  it('should return a string', () => {
    const tracker = new StepTracker('Title');
    const output = tracker.render();
    expect(typeof output).toBe('string');
  });

  // test_render_includes_title
  it('should include title in output', () => {
    const tracker = new StepTracker('My Custom Title');
    const output = tracker.render();
    expect(output).toContain('My Custom Title');
  });

  // test_done_uses_filled_circle
  it('should use filled circle ● for done status', () => {
    const tracker = new StepTracker('Title');
    tracker.add('step1', 'Done Step');
    tracker.complete('step1');
    const output = tracker.render();
    expect(output).toContain('●');
  });

  // test_pending_uses_dim_circle
  it('should use circle ○ for pending status', () => {
    const tracker = new StepTracker('Title');
    tracker.add('step1', 'Pending Step');
    const output = tracker.render();
    expect(output).toContain('○');
  });

  // test_running_uses_cyan_circle
  it('should use circle ○ for running status', () => {
    const tracker = new StepTracker('Title');
    tracker.add('step1', 'Running Step');
    tracker.start('step1');
    const output = tracker.render();
    expect(output).toContain('○');
  });

  // test_error_uses_red_circle
  it('should use filled circle ● for error status', () => {
    const tracker = new StepTracker('Title');
    tracker.add('step1', 'Error Step');
    tracker.error('step1');
    const output = tracker.render();
    expect(output).toContain('●');
  });

  // test_skipped_uses_yellow_circle
  it('should use circle ○ for skipped status', () => {
    const tracker = new StepTracker('Title');
    tracker.add('step1', 'Skipped Step');
    tracker.skip('step1');
    const output = tracker.render();
    expect(output).toContain('○');
  });

  // test_detail_in_parentheses
  it('should show detail in parentheses', () => {
    const tracker = new StepTracker('Title');
    tracker.add('step1', 'Step One');
    tracker.complete('step1', 'my detail');
    const output = tracker.render();
    expect(output).toContain('(my detail)');
  });

  // test_empty_detail_no_parentheses
  it('should not show parentheses when detail is empty', () => {
    const tracker = new StepTracker('Title');
    tracker.add('step1', 'Step One');
    tracker.complete('step1');
    const output = tracker.render();
    expect(output).not.toContain('()');
  });

  it('should include step labels in output', () => {
    const tracker = new StepTracker('Title');
    tracker.add('step1', 'My Step Label');
    const output = tracker.render();
    expect(output).toContain('My Step Label');
  });
});
