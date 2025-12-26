import { BookmarkFolder } from '../api/kinopub'
import { useI18n } from '../i18n'

interface FolderDialogProps {
  folders: BookmarkFolder[]
  focusedIndex: number
  onSelect: (index: number) => void
  onConfirm: () => void
}

export function FolderDialog({ folders, focusedIndex, onSelect, onConfirm }: FolderDialogProps) {
  const { t } = useI18n()

  return (
    <div class="item-folder-dialog-overlay">
      <div class="item-folder-dialog">
        <h2>{t.addToBookmarks}</h2>
        <div class="item-folder-list">
          {folders.map((folder, idx) => (
            <div
              key={folder.id}
              class={`item-folder-option ${focusedIndex === idx ? 'focused' : ''}`}
              onClick={() => {
                onSelect(idx)
                onConfirm()
              }}
            >
              <span class="item-folder-name">{folder.title}</span>
              <span class="item-folder-count">{folder.count}</span>
            </div>
          ))}
        </div>
        {folders.length === 0 && (
          <p class="item-folder-empty">{t.errorNoItems}</p>
        )}
      </div>
    </div>
  )
}
