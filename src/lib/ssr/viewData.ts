import type { File } from '@/lib/db/models/file';
import type { Folder } from '@/lib/db/models/folder';
import type { Tag } from '@/lib/db/models/tag';
import type { LimitedUser } from '@/lib/db/models/user';
import { parseString, type ParseValue } from '@/lib/parser';
import { formatRootUrl } from '@/lib/url';

type ViewFolder = Pick<Folder, 'id' | 'name' | 'public'>;
type ViewFile = Pick<File, 'id' | 'name' | 'originalName' | 'type' | 'size' | 'thumbnail'> & {
  tags?: Pick<Tag, 'id' | 'name' | 'color'>[];
  folder?: ViewFolder;
};

export type ViewFileData =
  | {
      requiresPassword: true;
      file: Pick<File, 'id' | 'name'>;
    }
  | {
      requiresPassword: false;
      file: ViewFile;
      code: boolean;
      token: string | null;
      view: {
        content: string | null;
        align: 'left' | 'center' | 'right';
        showMimetype: boolean;
      };
    };

export type ViewUrlData = {
  requiresPassword: boolean;
  url: { id: string; destination?: string };
};

export function createViewFileData({
  file,
  user,
  code,
  token,
  host,
  filesRoute,
  metrics,
}: {
  file: Omit<File, 'password'> & { password: string | null; folder: ViewFolder | null };
  user: LimitedUser;
  code: boolean;
  token: string | null;
  host: string;
  filesRoute: string;
  metrics?: Pick<ParseValue, 'metricsUser' | 'metricsZipline'>;
}): ViewFileData {
  if (file.password && !token) {
    return { requiresPassword: true, file: { id: file.id, name: file.name } };
  }

  const { password: _password, ...templateFile } = file;
  const { view } = user;
  const publicFile: ViewFile = {
    id: file.id,
    name: file.name,
    originalName: file.originalName,
    type: file.type,
    size: file.size,
    thumbnail: file.thumbnail ? { path: file.thumbnail.path } : null,
  };

  if (!code && view.showTags && file.tags) {
    publicFile.tags = file.tags.map(({ id, name, color }) => ({ id, name, color }));
  }

  if (!code && view.showFolder && file.folder) {
    const { id, name, public: isPublic } = file.folder;
    publicFile.folder = { id, name, public: isPublic };
  }

  const content = view.content
    ? parseString(view.content, {
        file: templateFile,
        user,
        ...metrics,
        link: {
          returned: `${host}${formatRootUrl(filesRoute, file.name)}`,
          raw: `${host}${formatRootUrl('/raw', file.name)}`,
        },
      })
    : null;

  return {
    requiresPassword: false,
    file: publicFile,
    code,
    token,
    view: { content, align: view.align ?? 'left', showMimetype: !!view.showMimetype },
  };
}
