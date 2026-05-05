import { describe, it, expect } from 'vitest';
import { createSpecStreamCompiler, compileSpecStream } from '../../src/streaming/compiler.js';

describe('SpecStreamCompiler', () => {
  const SAMPLE_JSONL = [
    '{"op":"add","path":"/root","value":"main"}',
    '{"op":"add","path":"/elements","value":{}}',
    '{"op":"add","path":"/elements/main","value":{"type":"stack","props":{"direction":"vertical"},"children":[]}}',
    '{"op":"add","path":"/elements/header","value":{"type":"text","props":{"content":"Dashboard"},"children":[]}}',
    '{"op":"add","path":"/elements/main/children/-","value":"header"}',
    '{"op":"add","path":"/elements/chart","value":{"type":"bar-chart","props":{"data":[]},"children":[]}}',
    '{"op":"add","path":"/elements/main/children/-","value":"chart"}',
  ].join('\n');

  describe('createSpecStreamCompiler', () => {
    it('builds spec from JSONL chunks', () => {
      const compiler = createSpecStreamCompiler();
      compiler.push(SAMPLE_JSONL + '\n');

      const spec = compiler.getSpec();
      expect(spec.root).toBe('main');
      expect(spec.elements.main.type).toBe('stack');
      expect(spec.elements.main.children).toEqual(['header', 'chart']);
      expect(spec.elements.header.props?.content).toBe('Dashboard');
    });

    it('handles incremental chunks (simulating streaming)', () => {
      const compiler = createSpecStreamCompiler();
      const lines = SAMPLE_JSONL.split('\n');

      // Feed one line at a time
      for (const line of lines) {
        compiler.push(line + '\n');
      }

      const spec = compiler.getSpec();
      expect(spec.root).toBe('main');
      expect(spec.elements.main.children).toEqual(['header', 'chart']);
    });

    it('handles partial chunks (split mid-line)', () => {
      const compiler = createSpecStreamCompiler();
      const fullLine = '{"op":"add","path":"/root","value":"main"}';

      // Split mid-line
      compiler.push(fullLine.slice(0, 20));
      expect(compiler.hasStarted()).toBe(false); // Not yet complete

      compiler.push(fullLine.slice(20) + '\n');
      expect(compiler.hasStarted()).toBe(true);
      expect(compiler.getSpec().root).toBe('main');
    });

    it('skips malformed lines', () => {
      const compiler = createSpecStreamCompiler();
      compiler.push('not valid json\n');
      compiler.push('{"op":"add","path":"/root","value":"ok"}\n');
      compiler.push('also invalid { broken\n');

      expect(compiler.getSpec().root).toBe('ok');
      expect(compiler.getPatches()).toHaveLength(1);
    });

    it('skips empty lines', () => {
      const compiler = createSpecStreamCompiler();
      compiler.push('\n\n{"op":"add","path":"/root","value":"x"}\n\n');
      expect(compiler.getSpec().root).toBe('x');
    });

    it('tracks new patches', () => {
      const compiler = createSpecStreamCompiler();
      compiler.push('{"op":"add","path":"/root","value":"a"}\n');
      compiler.push('{"op":"add","path":"/elements","value":{}}\n');

      const newOnes = compiler.getNewPatches();
      expect(newOnes).toHaveLength(2);

      compiler.push('{"op":"add","path":"/elements/x","value":{"type":"box"}}\n');
      const moreNew = compiler.getNewPatches();
      expect(moreNew).toHaveLength(1);
    });

    it('pushPatch applies a single patch', () => {
      const compiler = createSpecStreamCompiler();
      compiler.pushPatch({ op: 'add', path: '/root', value: 'main' });
      expect(compiler.getSpec().root).toBe('main');
    });

    it('hasStarted returns false before any patches', () => {
      const compiler = createSpecStreamCompiler();
      expect(compiler.hasStarted()).toBe(false);
    });
  });

  describe('compileSpecStream (one-shot)', () => {
    it('compiles full JSONL to Spec', () => {
      const spec = compileSpecStream(SAMPLE_JSONL);
      expect(spec.root).toBe('main');
      expect(spec.elements.main.type).toBe('stack');
      expect(spec.elements.main.children).toEqual(['header', 'chart']);
    });

    it('handles single-line input', () => {
      const spec = compileSpecStream('{"op":"add","path":"/root","value":"solo"}');
      expect(spec.root).toBe('solo');
    });
  });

  describe('inline mode (mixed prose + patches)', () => {
    it('ignores prose lines and processes only JSONL', () => {
      const input = [
        "Here's a dashboard showing your data:",
        '{"op":"add","path":"/root","value":"dash"}',
        '{"op":"add","path":"/elements","value":{}}',
        'Let me add a header:',
        '{"op":"add","path":"/elements/h","value":{"type":"text","props":{"content":"Hi"}}}',
        '{"op":"add","path":"/root","value":"dash"}',
      ].join('\n');

      const spec = compileSpecStream(input);
      expect(spec.root).toBe('dash');
      expect(spec.elements).toBeDefined();
      expect((spec.elements as Record<string, unknown>).h).toBeDefined();
    });
  });
});
