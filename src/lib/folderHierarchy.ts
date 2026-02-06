import { Folder } from './db/models/folder';

export type FolderHierarchyItem = {
  id: string;
  name: string;
  path: string;
  depth: number;
};

export type FolderBreadcrumb = {
  id: string | null;
  name: string;
  path?: string;
  public?: boolean;
};

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

export function buildFolderHierarchy(folders: Folder[], excludeIds?: Set<string>): FolderHierarchyItem[] {
  const childrenMap = new Map<string | null, Folder[]>();

  for (const folder of folders) {
    if (excludeIds?.has(folder.id)) continue;

    const parentId = folder.parentId ?? null;
    const siblings = childrenMap.get(parentId) || [];
    siblings.push(folder);
    childrenMap.set(parentId, siblings);
  }

  for (const children of childrenMap.values()) {
    children.sort((a, b) => a.name.localeCompare(b.name));
  }

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
