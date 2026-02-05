import { Folder } from './db/models/folder';

export interface FolderHierarchyItem {
  id: string;
  name: string;
  path: string;
  depth: number;
}

/**
 * Gets all descendant folder IDs for a given folder.
 * Recursively traverses the folder tree to find all children, grandchildren, etc.
 *
 * @param folderId - The ID of the parent folder
 * @param folders - Array of all folders
 * @returns Set of descendant folder IDs
 */
export function getDescendantIds(folderId: string, folders: Folder[]): Set<string> {
  const descendants = new Set<string>();
  const addDescendants = (parentId: string) => {
    for (const f of folders) {
      if (f.parentId === parentId) {
        descendants.add(f.id);
        addDescendants(f.id);
      }
    }
  };
  addDescendants(folderId);
  return descendants;
}

/**
 * Builds a hierarchical, sorted list of folders with depth and path information.
 *
 * @param folders - Array of all folders
 * @param excludeIds - Optional set of folder IDs to exclude from the hierarchy
 * @returns Array of folder items with hierarchy information (id, name, path, depth)
 */
export function buildFolderHierarchy(folders: Folder[], excludeIds?: Set<string>): FolderHierarchyItem[] {
  // Group children by parent
  const childrenMap = new Map<string | null, Folder[]>();

  for (const folder of folders) {
    // Skip excluded folders
    if (excludeIds?.has(folder.id)) continue;

    const parentId = folder.parentId ?? null;
    const siblings = childrenMap.get(parentId) || [];
    siblings.push(folder);
    childrenMap.set(parentId, siblings);
  }

  // Sort children alphabetically within each level
  for (const children of childrenMap.values()) {
    children.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Depth-first traversal to build ordered list
  const result: FolderHierarchyItem[] = [];

  const traverse = (folder: Folder, depth: number, pathParts: string[]) => {
    const currentPath = [...pathParts, folder.name];
    result.push({
      id: folder.id,
      name: folder.name,
      path: currentPath.join(' / '),
      depth,
    });

    const children = childrenMap.get(folder.id) || [];
    for (const child of children) {
      traverse(child, depth + 1, currentPath);
    }
  };

  const rootFolders = childrenMap.get(null) || [];
  for (const root of rootFolders) {
    traverse(root, 0, []);
  }

  return result;
}
