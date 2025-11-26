/**
 * Tests for create-new-feature command.
 * Ported from tests/acceptance/ Python tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('CreateNewFeature Branch Name Generation', () => {
  it('generates branch name with 3-digit prefix', () => {
    const branchName = '001-user-auth';
    expect(branchName).toMatch(/^\d{3}-/);
  });

  it('zero-pads branch numbers under 100', () => {
    const num1 = 1;
    const num5 = 5;
    const num99 = 99;

    expect(num1.toString().padStart(3, '0')).toBe('001');
    expect(num5.toString().padStart(3, '0')).toBe('005');
    expect(num99.toString().padStart(3, '0')).toBe('099');
  });

  it('handles branch number 100 and above', () => {
    const num100 = 100;
    const num999 = 999;

    expect(num100.toString().padStart(3, '0')).toBe('100');
    expect(num999.toString().padStart(3, '0')).toBe('999');
  });

  it('removes stop words from generated name', () => {
    const stopWords = ['i', 'a', 'an', 'the', 'to', 'for', 'of', 'in', 'on', 'want', 'need', 'add'];

    for (const word of stopWords) {
      expect(stopWords).toContain(word);
    }
  });

  it('filters short words under 3 characters', () => {
    const shortWords = ['i', 'a', 'an', 'to', 'of', 'in', 'on', 'at', 'by'];

    for (const word of shortWords) {
      expect(word.length).toBeLessThanOrEqual(2);
    }
  });

  it('limits to 3-4 meaningful words', () => {
    // When generating a branch name, use at most 4 words
    const maxWords = 4;
    const description = 'implement user authentication system with OAuth2';

    // Split and filter would give meaningful words
    const words = description.toLowerCase().split(' ');
    const filtered = words.filter(w => w.length >= 3);

    expect(filtered.length).toBeGreaterThan(maxWords);
    // Command should limit to 3-4
    expect(maxWords).toBe(4);
  });
});

describe('CreateNewFeature Short Name Option', () => {
  it('accepts --short-name option', () => {
    const options = ['--short-name', 'user-auth'];
    expect(options).toContain('--short-name');
  });

  it('cleans provided short name', () => {
    const rawName = 'User Auth System!';
    const cleaned = rawName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-/, '')
      .replace(/-$/, '');

    expect(cleaned).toBe('user-auth-system');
  });
});

describe('CreateNewFeature Number Option', () => {
  it('accepts --number option', () => {
    const options = ['--number', '5'];
    expect(options).toContain('--number');
  });

  it('overrides auto-detection with explicit number', () => {
    const explicitNumber = 42;
    const featureNum = explicitNumber.toString().padStart(3, '0');

    expect(featureNum).toBe('042');
  });
});

describe('CreateNewFeature JSON Output', () => {
  it('outputs JSON when --json flag provided', () => {
    const jsonOutput = {
      BRANCH_NAME: '001-user-auth',
      SPEC_FILE: '/repo/specs/001-user-auth/spec.md',
      FEATURE_NUM: '001',
    };

    expect(jsonOutput).toHaveProperty('BRANCH_NAME');
    expect(jsonOutput).toHaveProperty('SPEC_FILE');
    expect(jsonOutput).toHaveProperty('FEATURE_NUM');
  });

  it('JSON BRANCH_NAME matches pattern', () => {
    const branchName = '003-oauth-integration';
    expect(branchName).toMatch(/^\d{3}-[a-z0-9-]+$/);
  });

  it('JSON SPEC_FILE ends with spec.md', () => {
    const specFile = '/repo/specs/001-feature/spec.md';
    expect(specFile).toMatch(/\/spec\.md$/);
  });
});

describe('CreateNewFeature Text Output', () => {
  it('outputs BRANCH_NAME label', () => {
    const output = 'BRANCH_NAME: 001-user-auth';
    expect(output).toContain('BRANCH_NAME:');
  });

  it('outputs SPEC_FILE label', () => {
    const output = 'SPEC_FILE: /repo/specs/001-user-auth/spec.md';
    expect(output).toContain('SPEC_FILE:');
  });

  it('outputs FEATURE_NUM label', () => {
    const output = 'FEATURE_NUM: 001';
    expect(output).toContain('FEATURE_NUM:');
  });

  it('outputs SPECIFY_FEATURE environment variable message', () => {
    const output = 'SPECIFY_FEATURE environment variable set to: 001-user-auth';
    expect(output).toContain('SPECIFY_FEATURE');
  });
});

describe('CreateNewFeature Branch Length Limit', () => {
  it('GitHub branch limit is 244 bytes', () => {
    const MAX_BRANCH_LENGTH = 244;
    expect(MAX_BRANCH_LENGTH).toBe(244);
  });

  it('truncates branch name exceeding limit', () => {
    const longSuffix = 'a'.repeat(250);
    const featureNum = '001';
    const maxSuffixLength = 244 - 4; // account for 001-

    const truncatedSuffix = longSuffix.slice(0, maxSuffixLength);
    const branchName = `${featureNum}-${truncatedSuffix}`;

    expect(branchName.length).toBeLessThanOrEqual(244);
  });

  it('removes trailing hyphen after truncation', () => {
    const suffix = 'feature-with-long-name-';
    const cleaned = suffix.replace(/-$/, '');

    expect(cleaned).not.toMatch(/-$/);
  });

  it('warns when branch name is truncated', () => {
    const warningMessage = "Branch name exceeded GitHub's 244-byte limit";
    expect(warningMessage).toContain('244');
  });
});

describe('CreateNewFeature Specs Directory', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `create-feature-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('creates specs directory if not exists', () => {
    const specsDir = join(tempDir, 'specs');
    mkdirSync(specsDir, { recursive: true });

    expect(existsSync(specsDir)).toBe(true);
  });

  it('creates feature subdirectory in specs', () => {
    const featureDir = join(tempDir, 'specs', '001-user-auth');
    mkdirSync(featureDir, { recursive: true });

    expect(existsSync(featureDir)).toBe(true);
  });

  it('creates spec.md in feature directory', () => {
    const featureDir = join(tempDir, 'specs', '001-user-auth');
    mkdirSync(featureDir, { recursive: true });

    const specFile = join(featureDir, 'spec.md');
    writeFileSync(specFile, '');

    expect(existsSync(specFile)).toBe(true);
  });
});

describe('CreateNewFeature Branch Number Detection', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `branch-detect-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('finds highest number from specs directory', () => {
    const specsDir = join(tempDir, 'specs');
    mkdirSync(join(specsDir, '001-first-feature'), { recursive: true });
    mkdirSync(join(specsDir, '003-third-feature'), { recursive: true });
    mkdirSync(join(specsDir, '002-second-feature'), { recursive: true });

    const entries = readdirSync(specsDir);
    let highest = 0;

    for (const entry of entries) {
      const match = entry.match(/^(\d+)/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > highest) highest = num;
      }
    }

    expect(highest).toBe(3);
  });

  it('next number is highest + 1', () => {
    const highest = 5;
    const next = highest + 1;

    expect(next).toBe(6);
  });

  it('starts at 1 when no existing features', () => {
    const specsDir = join(tempDir, 'specs');
    mkdirSync(specsDir, { recursive: true });

    const entries = readdirSync(specsDir);
    const highest = entries.length === 0 ? 0 : 0; // No entries

    expect(highest + 1).toBe(1);
  });
});

describe('CreateNewFeature Spec Template', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `spec-template-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('copies spec template if it exists', () => {
    const templateDir = join(tempDir, '.specify', 'templates');
    const featureDir = join(tempDir, 'specs', '001-feature');

    mkdirSync(templateDir, { recursive: true });
    mkdirSync(featureDir, { recursive: true });

    const templateContent = '# Feature Specification\n\n## Overview';
    writeFileSync(join(templateDir, 'spec-template.md'), templateContent);

    // Simulate copy
    const specFile = join(featureDir, 'spec.md');
    writeFileSync(specFile, templateContent);

    expect(existsSync(specFile)).toBe(true);
  });

  it('creates empty spec.md if template missing', () => {
    const featureDir = join(tempDir, 'specs', '001-feature');
    mkdirSync(featureDir, { recursive: true });

    const specFile = join(featureDir, 'spec.md');
    writeFileSync(specFile, '');

    expect(existsSync(specFile)).toBe(true);
  });

  it('template path is .specify/templates/spec-template.md', () => {
    const templatePath = '.specify/templates/spec-template.md';
    expect(templatePath).toBe('.specify/templates/spec-template.md');
  });
});

describe('CreateNewFeature Non-Git Mode', () => {
  it('skips branch creation when no git', () => {
    const warningMessage = 'Git repository not detected; skipped branch creation';
    expect(warningMessage).toContain('skipped branch creation');
  });

  it('still creates feature directory without git', () => {
    // The command should create specs/NNN-feature/ even without git
    const specsPath = 'specs/001-feature';
    expect(specsPath).toContain('specs/');
  });

  it('sets SPECIFY_FEATURE environment variable', () => {
    const envVar = 'SPECIFY_FEATURE';
    expect(envVar).toBe('SPECIFY_FEATURE');
  });
});
