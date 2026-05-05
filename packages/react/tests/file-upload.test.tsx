import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUpload } from '../src/primitives/file-upload.js';
import type { UploadFileState } from 'mythik';
import '@testing-library/jest-dom';

// Mock URL.createObjectURL / revokeObjectURL
const createObjectURLMock = vi.fn().mockReturnValue('blob:preview-url');
const revokeObjectURLMock = vi.fn();
globalThis.URL.createObjectURL = createObjectURLMock;
globalThis.URL.revokeObjectURL = revokeObjectURLMock;

function makeFileState(overrides: Partial<UploadFileState> = {}): UploadFileState {
  return {
    name: 'photo.jpg',
    size: 2458624,
    type: 'image/jpeg',
    progress: 100,
    status: 'done',
    previewUrl: null,
    error: null,
    ...overrides,
  };
}

describe('FileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Rendering modes ---
  it('renders button mode by default', () => {
    render(<FileUpload label="Upload" />);
    expect(screen.getByText('Upload')).toBeInTheDocument();
  });

  it('renders drop zone when dropZone=true', () => {
    render(<FileUpload dropZone label="Drag files here" />);
    expect(screen.getByText('Drag files here')).toBeInTheDocument();
  });

  it('renders disabled state', () => {
    render(<FileUpload disabled label="Upload" />);
    const btn = screen.getByText('Upload');
    expect(btn).toBeInTheDocument();
  });

  // --- File selection ---
  it('calls onFiles when files are selected', () => {
    const onFiles = vi.fn();
    render(<FileUpload onFiles={onFiles} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFiles).toHaveBeenCalledWith([file]);
  });

  it('passes accept to input element', () => {
    render(<FileUpload accept="image/*" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toBe('image/*');
  });

  it('passes multiple to input element', () => {
    render(<FileUpload multiple />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.multiple).toBe(true);
  });

  // --- File list display ---
  it('renders file list with names and sizes', () => {
    render(<FileUpload uploadState={[makeFileState()]} />);
    expect(screen.getByText('photo.jpg')).toBeInTheDocument();
    expect(screen.getByText('2.3 MB')).toBeInTheDocument();
  });

  it('renders progress bar for uploading file', () => {
    render(<FileUpload uploadState={[makeFileState({ status: 'uploading', progress: 65 })]} />);
    const progressBar = document.querySelector('[role="progressbar"]');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar?.getAttribute('aria-valuenow')).toBe('65');
  });

  it('renders error state with message', () => {
    render(<FileUpload uploadState={[makeFileState({ status: 'error', error: 'File too large. Max: 10.0 MB', progress: 0 })]} />);
    expect(screen.getByText('File too large. Max: 10.0 MB')).toBeInTheDocument();
  });

  it('renders image preview when previewUrl is set', () => {
    render(<FileUpload uploadState={[makeFileState({ previewUrl: 'blob:preview' })]} preview />);
    const img = document.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img?.src).toContain('blob:preview');
  });

  it('renders file icon for non-image types', () => {
    render(<FileUpload uploadState={[makeFileState({ name: 'report.pdf', type: 'application/pdf', previewUrl: null })]} preview />);
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  // --- Remove button ---
  it('calls onRemove with index when remove button clicked', () => {
    const onRemove = vi.fn();
    render(<FileUpload uploadState={[makeFileState()]} onRemove={onRemove} />);
    const removeBtn = screen.getByLabelText('Remove photo.jpg');
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  // --- Retry button ---
  it('calls onRetry with index when retry button clicked', () => {
    const onRetry = vi.fn();
    render(<FileUpload uploadState={[makeFileState({ name: 'fail.jpg', status: 'error', error: 'Network error', progress: 0 })]} onRetry={onRetry} />);
    const retryBtn = screen.getByLabelText('Retry fail.jpg');
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledWith(0);
  });

  // --- Theme ---
  it('applies theme colors from _tokens', () => {
    render(<FileUpload _tokens={{ colors: { border: '#0D9488', primary: '#0D9488' } }} label="Upload" />);
    expect(screen.getByText('Upload')).toBeInTheDocument();
  });
});
