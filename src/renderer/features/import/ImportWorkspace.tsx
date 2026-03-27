import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import type { CommitImportBatchResult, PriorImportBatchInspection, StageImportFilesResult, StagedImportFile } from '../../../shared/contracts/import'
import { ImportSummary } from './ImportSummary'
import { ImportWorkspaceHeader } from './ImportWorkspaceHeader'
import { ReasonPanel } from './ReasonPanel'
import { StagedFileRow } from './StagedFileRow'
import { WorksheetChoicePanel } from './WorksheetChoicePanel'

interface ImportWorkspaceProps {
  onBackToDashboard: () => void
}

type ActivePanel =
  | { type: 'worksheet'; fileId: string }
  | { type: 'reason'; fileId: string }
  | { type: 'prior-batch'; fileId: string; details?: PriorImportBatchInspection }
  | undefined

const sectionOrder: Array<{ status: StagedImportFile['status']; heading: string }> = [
  { status: 'ready', heading: 'Ready' },
  { status: 'needs-sheet-selection', heading: 'Needs sheet selection' },
  { status: 'rejected', heading: 'Rejected' },
  { status: 'duplicate-blocked', heading: 'Duplicate blocked' },
  { status: 'imported', heading: 'Imported' }
]

const isMockWalnut = () => Boolean((window.walnut as typeof window.walnut & { __mock?: true }).__mock)

export const ImportWorkspace = ({ onBackToDashboard }: ImportWorkspaceProps) => {
  const [stagedFiles, setStagedFiles] = useState<StagedImportFile[]>([])
  const [summary, setSummary] = useState<CommitImportBatchResult | undefined>()
  const [activePanel, setActivePanel] = useState<ActivePanel>()
  const [busyLabel, setBusyLabel] = useState<string>()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const stagingHeadingRef = useRef<HTMLHeadingElement>(null)

  const processedCount = useMemo(
    () => stagedFiles.filter((file) => ['rejected', 'duplicate-blocked', 'imported'].includes(file.status)).length,
    [stagedFiles]
  )

  useEffect(() => {
    if (stagedFiles.length > 0 && !summary) {
      stagingHeadingRef.current?.focus()
    }
  }, [stagedFiles, summary])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activePanel) {
        setActivePanel(undefined)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activePanel])

  const updateStage = (result: StageImportFilesResult) => {
    setSummary(undefined)
    setStagedFiles(result.stagedFiles)
  }

  const handleImportClick = async () => {
    setBusyLabel('Preparing files')
    try {
      if (isMockWalnut()) {
        fileInputRef.current?.click()
        return
      }

      updateStage(await window.walnut.stageImportFiles())
    } finally {
      setBusyLabel(undefined)
    }
  }

  const handleFileInput = async (event: ChangeEvent<HTMLInputElement>) => {
    const filePaths = Array.from(event.target.files ?? []).map((file) => file.name)
    if (filePaths.length === 0) {
      return
    }

    setBusyLabel('Preparing files')
    try {
      updateStage(await window.walnut.stageImportFiles({ filePaths }))
    } finally {
      setBusyLabel(undefined)
      event.target.value = ''
    }
  }

  const handleChooseSheet = async (fileId: string, worksheetName: string) => {
    updateStage(await window.walnut.chooseImportSheet({ stagedFileId: fileId, worksheetName }))
    setActivePanel(undefined)
  }

  const handleRemove = async (fileId: string) => {
    updateStage(await window.walnut.removeStagedFile({ stagedFileId: fileId }))
    if (activePanel?.fileId === fileId) {
      setActivePanel(undefined)
    }
  }

  const handleCommit = async () => {
    setBusyLabel('Importing statements')
    try {
      setSummary(await window.walnut.commitImportBatch())
      setStagedFiles([])
      setActivePanel(undefined)
    } finally {
      setBusyLabel(undefined)
    }
  }

  const handleViewEarlierBatch = async (fileId: string) => {
    const file = stagedFiles.find((candidate) => candidate.id === fileId)
    if (!file?.priorBatch?.priorBatchId) {
      return
    }

    const details = await window.walnut.inspectPriorImportBatch(file.priorBatch.priorBatchId)
    setActivePanel({ type: 'prior-batch', fileId, details })
  }

  const activeFile = activePanel?.fileId ? stagedFiles.find((file) => file.id === activePanel.fileId) : undefined
  const canImport = stagedFiles.some((file) => file.status === 'ready')

  return (
    <section style={styles.root}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xls,.xlsx"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />
      <ImportWorkspaceHeader
        processedCount={summary ? summary.importedFiles.length + summary.rejectedFiles.length + summary.duplicateBlockedFiles.length : processedCount}
        totalCount={summary ? summary.importedFiles.length + summary.rejectedFiles.length + summary.duplicateBlockedFiles.length : stagedFiles.length}
        busyLabel={busyLabel}
        onImportClick={handleImportClick}
      />
      <div style={styles.layout}>
        <div style={styles.taskColumn}>
          {!summary ? (
            <>
              <section style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <div style={styles.kicker}>Staged batch flow</div>
                    <h3 ref={stagingHeadingRef} tabIndex={-1} style={styles.cardHeading}>
                      {stagedFiles.length === 0 ? 'Select files' : 'Review staged files'}
                    </h3>
                  </div>
                  <button type="button" style={styles.secondaryButton} onClick={onBackToDashboard}>
                    Back to dashboard
                  </button>
                </div>
                <p style={styles.helper}>
                  {stagedFiles.length === 0
                    ? 'Use the file picker to stage one or more ICICI statements before importing them.'
                    : 'Review each file row, resolve any sheet choices, and keep rejected or duplicate-blocked files visible while you decide what to import.'}
                </p>
              </section>

              {sectionOrder.map((section) => {
                const files = stagedFiles.filter((file) => file.status === section.status)
                if (files.length === 0) {
                  return null
                }

                return (
                  <section key={section.status} style={styles.card}>
                    <h3 style={styles.cardHeading}>{section.heading}</h3>
                    <div style={styles.list}>
                      {files.map((file) => (
                        <StagedFileRow
                          key={file.id}
                          file={file}
                          onReviewSheet={(fileId) => setActivePanel({ type: 'worksheet', fileId })}
                          onViewReason={(fileId) => setActivePanel({ type: 'reason', fileId })}
                          onViewEarlierBatch={(fileId) => void handleViewEarlierBatch(fileId)}
                          onRemove={(fileId) => void handleRemove(fileId)}
                        />
                      ))}
                    </div>
                  </section>
                )
              })}

              {stagedFiles.length > 0 ? (
                <section style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div>
                      <div style={styles.kicker}>Resolve sheet choice if needed</div>
                      <h3 style={styles.cardHeading}>Import summary</h3>
                    </div>
                    <button
                      type="button"
                      aria-label="Commit staged import batch"
                      style={{ ...styles.primaryButton, opacity: canImport ? 1 : 0.6 }}
                      onClick={() => void handleCommit()}
                      disabled={!canImport && stagedFiles.length === 0}
                    >
                      Import statements
                    </button>
                  </div>
                  <p style={styles.helper}>
                    Walnut will import every ready file, keep rejected and duplicate-blocked files visible in the result, and never store the source statements.
                  </p>
                </section>
              ) : null}
            </>
          ) : (
            <ImportSummary summary={summary} />
          )}
        </div>
        <aside style={styles.guidanceColumn}>
          {activePanel?.type === 'worksheet' && activeFile?.worksheetCandidates ? (
            <WorksheetChoicePanel
              fileName={activeFile.fileName}
              selectedWorksheetName={activeFile.selectedWorksheetName}
              worksheetCandidates={activeFile.worksheetCandidates}
              onSelect={(worksheetName) => void handleChooseSheet(activeFile.id, worksheetName)}
              onClose={() => setActivePanel(undefined)}
            />
          ) : null}
          {activePanel?.type === 'reason' && activeFile ? (
            <ReasonPanel
              heading={activeFile.reasonTitle ?? 'Review file status'}
              body={activeFile.reasonBody ?? 'This file could not be imported. Review the supported ICICI export requirements and try again.'}
              metadata={[
                activeFile.accountLabel ? `Account: ${activeFile.accountLabel}` : '',
                activeFile.statementPeriodLabel ? `Statement period: ${activeFile.statementPeriodLabel}` : ''
              ].filter(Boolean)}
              onClose={() => setActivePanel(undefined)}
            />
          ) : null}
          {activePanel?.type === 'prior-batch' && activePanel.details ? (
            <ReasonPanel
              heading={`Earlier batch: ${activePanel.details.batchLabel}`}
              body="This file matches an earlier imported batch. Review that batch before deciding whether you still need this statement in the current import."
              metadata={[
                `Imported at: ${activePanel.details.importedAt}`,
                `Files in batch: ${activePanel.details.fileCount}`,
                `Transactions imported: ${activePanel.details.importedTransactionCount}`,
                `Files: ${activePanel.details.fileNames.join(', ')}`
              ]}
              onClose={() => setActivePanel(undefined)}
            />
          ) : (
            <section style={styles.guidanceCard}>
              <div style={styles.kicker}>Supported format guidance</div>
              <h3 style={styles.cardHeading}>Bring in your ICICI statements</h3>
              <ul style={styles.guidanceList}>
                <li>Use ICICI CSV, XLS, or XLSX exports.</li>
                <li>Stage files before importing them.</li>
                <li>Review duplicates and unsupported files inside the batch.</li>
                <li>Statement files are read for import and are not stored by Walnut.</li>
              </ul>
            </section>
          )}
        </aside>
      </div>
    </section>
  )
}

const styles = {
  root: {
    width: 'min(100%, 1180px)',
    display: 'grid',
    gap: 'var(--space-xl)'
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 760px) minmax(260px, 320px)',
    gap: 'var(--space-xl)',
    alignItems: 'start'
  },
  taskColumn: {
    display: 'grid',
    gap: 'var(--space-lg)'
  },
  guidanceColumn: {
    display: 'grid',
    gap: 'var(--space-lg)'
  },
  card: {
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.72)',
    boxShadow: 'var(--shadow-panel)'
  },
  guidanceCard: {
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    background: 'rgba(226, 215, 197, 0.72)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-md)',
    alignItems: 'center'
  },
  kicker: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-accent)'
  },
  cardHeading: {
    margin: 'var(--space-sm) 0 0 0',
    fontSize: 'var(--font-heading-size)',
    lineHeight: 1.2
  },
  helper: {
    margin: 0,
    color: 'var(--color-muted)'
  },
  list: {
    display: 'grid',
    gap: 'var(--space-md)'
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(30, 27, 22, 0.04)',
    color: 'var(--color-ink)',
    padding: '0 18px',
    fontWeight: 600
  },
  primaryButton: {
    minHeight: 56,
    border: 0,
    borderRadius: 999,
    background: 'var(--color-accent)',
    color: '#fff',
    padding: '0 24px',
    fontWeight: 700
  },
  guidanceList: {
    margin: 0,
    paddingLeft: 'var(--space-lg)',
    color: 'var(--color-muted)',
    display: 'grid',
    gap: 'var(--space-sm)'
  }
}
