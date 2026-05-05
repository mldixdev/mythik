import type { CSSProperties, ReactNode } from 'react';

/** Props that every primitive receives from the engine */
export interface PrimitiveProps {
  style?: CSSProperties;
  children?: ReactNode;
  [key: string]: unknown;
}

/** A React primitive component */
export type PrimitiveComponent = (props: PrimitiveProps) => ReactNode;
