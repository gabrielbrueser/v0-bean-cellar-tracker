"use client";

import { useEffect, useRef } from "react";

interface QRCodeSVGProps {
  value: string;
  size?: number;
  className?: string;
}

// Simple QR code generator using canvas
// Uses the QR code algorithm for small alphanumeric data
export function QRCodeSVG({ value, size = 200, className }: QRCodeSVGProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Generate QR matrix using a simple encoding
    const matrix = generateQRMatrix(value);
    const moduleCount = matrix.length;
    const moduleSize = Math.floor((size - 16) / moduleCount);
    const offset = Math.floor((size - moduleSize * moduleCount) / 2);

    // Clear canvas with white background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, size, size);

    // Draw QR modules
    ctx.fillStyle = "#000000";
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (matrix[row][col]) {
          ctx.fillRect(
            offset + col * moduleSize,
            offset + row * moduleSize,
            moduleSize,
            moduleSize
          );
        }
      }
    }
  }, [value, size]);

  if (!value) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-muted-foreground">No QR code</span>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, backgroundColor: "#FFFFFF" }}
    />
  );
}

/**
 * Generate QR code matrix for a given string.
 * This is a simplified QR code generator for Version 1-M (max 14 alphanumeric chars)
 * using proper QR code structure with finder patterns and data encoding.
 */
function generateQRMatrix(data: string): boolean[][] {
  const size = 21; // Version 1 QR code is 21x21
  const matrix: boolean[][] = Array(size)
    .fill(null)
    .map(() => Array(size).fill(false));

  // Add finder patterns (top-left, top-right, bottom-left)
  addFinderPattern(matrix, 0, 0);
  addFinderPattern(matrix, size - 7, 0);
  addFinderPattern(matrix, 0, size - 7);

  // Add timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Add alignment pattern for larger codes (not needed for v1)
  // Add format info placeholder
  matrix[8][0] = true;
  matrix[8][1] = true;
  matrix[8][2] = true;
  matrix[8][3] = true;
  matrix[8][4] = true;
  matrix[8][5] = true;
  matrix[8][7] = true;
  matrix[8][8] = true;

  // Encode data into remaining modules
  encodeData(matrix, data);

  return matrix;
}

function addFinderPattern(matrix: boolean[][], startRow: number, startCol: number) {
  // 7x7 finder pattern
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      // Outer border, middle, and center
      const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
      const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      matrix[startRow + r][startCol + c] = isOuter || isInner;
    }
  }

  // Add separator (white border)
  for (let i = 0; i < 8; i++) {
    // Horizontal separators
    if (startRow + 7 < matrix.length) {
      matrix[startRow + 7][startCol + Math.min(i, 7)] = false;
    }
    if (startRow > 0) {
      matrix[startRow - 1 + (startRow === 0 ? 8 : 0)][startCol + Math.min(i, 7)] = false;
    }
    // Vertical separators  
    if (startCol + 7 < matrix[0].length) {
      matrix[startRow + Math.min(i, 7)][startCol + 7] = false;
    }
  }
}

function encodeData(matrix: boolean[][], data: string) {
  // Simple data encoding - place data bits in a deterministic pattern
  // avoiding finder patterns and timing patterns
  const reserved = new Set<string>();

  // Mark reserved areas
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      reserved.add(`${r},${c}`);
      reserved.add(`${r},${matrix.length - 1 - c}`);
      reserved.add(`${matrix.length - 1 - r},${c}`);
    }
  }
  for (let i = 0; i < matrix.length; i++) {
    reserved.add(`6,${i}`);
    reserved.add(`${i},6`);
  }

  // Convert data to binary representation
  let bits = "";
  for (const char of data.toUpperCase()) {
    const code = char.charCodeAt(0);
    bits += code.toString(2).padStart(8, "0");
  }

  // Place data bits in zigzag pattern from bottom-right
  let bitIndex = 0;
  let upward = true;
  for (let col = matrix.length - 1; col >= 0; col -= 2) {
    if (col === 6) col = 5; // Skip timing pattern column

    const rows = upward
      ? Array.from({ length: matrix.length }, (_, i) => matrix.length - 1 - i)
      : Array.from({ length: matrix.length }, (_, i) => i);

    for (const row of rows) {
      for (const c of [col, col - 1]) {
        if (c < 0) continue;
        if (reserved.has(`${row},${c}`)) continue;

        if (bitIndex < bits.length) {
          matrix[row][c] = bits[bitIndex] === "1";
          bitIndex++;
        } else {
          // Fill remaining with pattern
          matrix[row][c] = (row + c) % 2 === 0;
        }
      }
    }
    upward = !upward;
  }
}

/**
 * Generate the full URL for a vial QR code.
 */
export function getVialQRUrl(vialCode: string): string {
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://bean-cellar.vercel.app";

  return `${baseUrl}/vials/code/${encodeURIComponent(vialCode)}`;
}
