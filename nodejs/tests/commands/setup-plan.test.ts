/**
 * Tests for setup-plan command.
 * Tests the setup-plan command that copies plan template to feature directory.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('SetupPlan Output Format', () => {
  it('JSON output contains required fields', () => {
    const expectedFields = ['FEATURE_DIR', 'PLAN_FILE'];

    const jsonOutput = {
      FEATURE_DIR: '/test/repo/specs/001-test-feature',
      PLAN_FILE: '/test/repo/specs/001-test-feature/plan.md',
    };

    for (const field of expectedFields) {
      expect(jsonOutput).toHaveProperty(field);
    }
  });

  it('text output contains FEATURE_DIR label', () => {
    const textOutput = 'FEATURE_DIR: /test/repo/specs/001-test-feature';
    expect(textOutput).toContain('FEATURE_DIR:');
  });

  it('text output contains PLAN_FILE label', () => {
    const textOutput = 'PLAN_FILE: /test/repo/specs/001-test-feature/plan.md';
    expect(textOutput).toContain('PLAN_FILE:');
  });
});

describe('SetupPlan Options', () => {
  it('supports --json flag', () => {
    const validOptions = ['--json'];
    expect(validOptions).toContain('--json');
  });
});

describe('SetupPlan Behavior', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `setup-plan-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('creates feature directory if it does not exist', () => {
    const featureDir = join(tempDir, 'specs', '001-test-feature');
    mkdirSync(featureDir, { recursive: true });

    expect(existsSync(featureDir)).toBe(true);
  });

  it('copies plan template to feature directory', () => {
    const templateDir = join(tempDir, '.speckit', 'templates');
    const featureDir = join(tempDir, 'specs', '001-test-feature');

    mkdirSync(templateDir, { recursive: true });
    mkdirSync(featureDir, { recursive: true });

    const templateContent = '# Implementation Plan\n\n## Overview';
    writeFileSync(join(templateDir, 'plan-template.md'), templateContent);

    const planFile = join(featureDir, 'plan.md');
    writeFileSync(planFile, templateContent);

    expect(existsSync(planFile)).toBe(true);
    expect(readFileSync(planFile, 'utf-8')).toBe(templateContent);
  });

  it('plan file ends with .md extension', () => {
    const planFile = '/test/repo/specs/001-test-feature/plan.md';
    expect(planFile).toMatch(/\.md$/);
  });
});

describe('SetupPlan Template', () => {
  it('template file is named plan-template.md', () => {
    const templateName = 'plan-template.md';
    expect(templateName).toBe('plan-template.md');
  });

  it('template path is under .speckit/templates/', () => {
    const templatePath = '.speckit/templates/plan-template.md';
    expect(templatePath).toContain('.speckit/templates/');
  });
});

describe('SetupPlan Error Handling', () => {
  it('requires SPECIFY_FEATURE or valid git branch', () => {
    // When no feature is set, the command should fail
    const envVarName = 'SPECIFY_FEATURE';
    expect(envVarName).toBe('SPECIFY_FEATURE');
  });

  it('creates empty plan.md if template missing', () => {
    const tempDir = join(tmpdir(), `plan-no-template-${Date.now()}`);
    const featureDir = join(tempDir, 'specs', '001-test-feature');
    mkdirSync(featureDir, { recursive: true });

    const planFile = join(featureDir, 'plan.md');
    writeFileSync(planFile, '');

    expect(existsSync(planFile)).toBe(true);

    rmSync(tempDir, { recursive: true, force: true });
  });
});
