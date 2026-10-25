import path from "path";

/**
 * Supported File Types, Extensions, and Magic Number Signatures.
 * Validates extension, declared MIME, and binary magic bytes together.
 */
export interface AllowedFileType {
  extension: string;
  mimeTypes: string[];
  magicBytes?: number[][]; // Byte sequences at start of file
}

export const ALLOWED_FILE_TYPES: Record<string, AllowedFileType> = {
  pdf: {
    extension: ".pdf",
    mimeTypes: ["application/pdf"],
    magicBytes: [[0x25, 0x50, 0x44, 0x46]], // %PDF
  },
  zip: {
    extension: ".zip",
    mimeTypes: ["application/zip", "application/x-zip-compressed"],
    magicBytes: [
      [0x50, 0x4b, 0x03, 0x04],
      [0x50, 0x4b, 0x05, 0x06],
      [0x50, 0x4b, 0x07, 0x08],
    ], // PK..
  },
  png: {
    extension: ".png",
    mimeTypes: ["image/png"],
    magicBytes: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]], // \x89PNG\r\n\x1a\n
  },
  jpeg: {
    extension: ".jpeg",
    mimeTypes: ["image/jpeg"],
    magicBytes: [[0xff, 0xd8, 0xff]], // JPEG SOI
  },
  jpg: {
    extension: ".jpg",
    mimeTypes: ["image/jpeg"],
    magicBytes: [[0xff, 0xd8, 0xff]],
  },
  docx: {
    extension: ".docx",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/zip", // DOCX is a zip package
    ],
    magicBytes: [[0x50, 0x4b, 0x03, 0x04]], // PK..
  },
  xlsx: {
    extension: ".xlsx",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/zip", // XLSX is a zip package
    ],
    magicBytes: [[0x50, 0x4b, 0x03, 0x04]], // PK..
  },
  txt: {
    extension: ".txt",
    mimeTypes: ["text/plain"],
    // Text files don't have static magic bytes, validated via character inspection
  },
};

export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MB

export function validateFileSafety(
  buffer: Buffer,
  originalFilename: string,
  declaredMimeType: string
): { isValid: boolean; normalizedName: string; mimeType: string; error?: string } {
  if (!originalFilename || typeof originalFilename !== "string") {
    return { isValid: false, normalizedName: "", mimeType: "", error: "Missing filename" };
  }

  // Prevent path traversal and strip dangerous characters
  const baseName = path.basename(originalFilename).trim();
  const normalizedName = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");

  if (!normalizedName || normalizedName.startsWith(".")) {
    return {
      isValid: false,
      normalizedName: "",
      mimeType: "",
      error: "Invalid or hidden filename.",
    };
  }

  const ext = path.extname(normalizedName).toLowerCase();
  const typeKey = ext.replace(".", "");

  const typeConfig = ALLOWED_FILE_TYPES[typeKey];
  if (!typeConfig) {
    return {
      isValid: false,
      normalizedName,
      mimeType: declaredMimeType,
      error: `File extension "${ext}" is not permitted. Permitted types: PDF, ZIP, PNG, JPG, DOCX, XLSX, TXT.`,
    };
  }

  // Check declared MIME type
  const isMimeAllowed =
    !declaredMimeType ||
    typeConfig.mimeTypes.includes(declaredMimeType.toLowerCase()) ||
    declaredMimeType === "application/octet-stream";

  if (!isMimeAllowed) {
    return {
      isValid: false,
      normalizedName,
      mimeType: declaredMimeType,
      error: `MIME type "${declaredMimeType}" does not match file extension "${ext}".`,
    };
  }

  // Verify binary magic numbers when specified
  if (typeConfig.magicBytes && typeConfig.magicBytes.length > 0) {
    if (buffer.length < 4) {
      return {
        isValid: false,
        normalizedName,
        mimeType: declaredMimeType,
        error: "File is too small to be a valid document.",
      };
    }

    const matchesMagic = typeConfig.magicBytes.some((expectedSeq) => {
      if (buffer.length < expectedSeq.length) return false;
      for (let i = 0; i < expectedSeq.length; i++) {
        if (buffer[i] !== expectedSeq[i]) return false;
      }
      return true;
    });

    if (!matchesMagic) {
      return {
        isValid: false,
        normalizedName,
        mimeType: declaredMimeType,
        error: `File signature mismatch for "${ext}". File header is corrupted or spoofed.`,
      };
    }
  }

  // For text files, ensure buffer is valid UTF-8/ASCII without null bytes or binary execution headers
  if (typeKey === "txt") {
    // Check first 1024 bytes for null bytes (indicators of binary or ELF/PE header)
    const checkLength = Math.min(buffer.length, 1024);
    for (let i = 0; i < checkLength; i++) {
      if (buffer[i] === 0x00) {
        return {
          isValid: false,
          normalizedName,
          mimeType: declaredMimeType,
          error: "Binary content detected in plain text file.",
        };
      }
    }
  }

  const canonicalMime = typeConfig.mimeTypes[0];
  return { isValid: true, normalizedName, mimeType: canonicalMime };
}
