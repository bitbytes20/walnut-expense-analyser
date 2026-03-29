import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import type { CommitImportBatchResult, PriorImportBatchInspection, StageImportFilesResult, StagedImportFile } from '../../../shared/contracts/import'
import { ImportSummary } from './ImportSummary'
import { ImportWorkspaceHeader } from './ImportWorkspaceHeader'
import { ReasonPanel } from './ReasonPanel'
import { StagedFileRow } from './StagedFileRow'
import { WorksheetChoicePanel } from './WorksheetChoicePanel'

interface ImportWorkspaceProps {
  onBackToDashboard: () => void
  onOpenHistory: () => void
}

type ActivePanel =
  | { type: 'worksheet'; fileId: string }
  | { type: 'reason'; fileId: string }
  | { type: 'prior-batch'; fileId: string; details?: PriorImportBatchInspection }
  | undefined

const sectionOrder: Array<{ status: StagedImportFile['status']; heading: string; description: string }> = [
  { status: 'ready', heading: 'Ready to import', description: 'These files can be imported as soon as the batch feels complete.' },
  { status: 'needs-sheet-selection', heading: 'Needs sheet selection', description: 'Pick the worksheet Walnut should parse before import can continue.' },
  { status: 'rejected', heading: 'Rejected', description: 'These files could not be used and need a quick review before you retry.' },
  { status: 'duplicate-blocked', heading: 'Duplicate blocked', description: 'Walnut found an earlier batch match and blocked these files for safety.' },
  { status: 'imported', heading: 'Imported in this workspace', description: 'These files already made it into the current import result.' }
]

const isMockWalnut = () => Boolean((window.walnut as typeof window.walnut & { __mock?: true }).__mock)

export const ImportWorkspace = ({ onBackToDashboard, onOpenHistory }: ImportWorkspaceProps) => {
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

  const readyCount = useMemo(() => stagedFiles.filter((file) => file.status === 'ready').length, [stagedFiles])
  const blockedCount = useMemo(
    () => stagedFiles.filter((file) => ['rejected', 'duplicate-blocked', 'needs-sheet-selection'].includes(file.status)).length,
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
              <section style={styles.controlCard}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardTitleBlock}>
                    <div style={styles.kicker}>Current batch</div>
                    <h3 ref={stagingHeadingRef} tabIndex={-1} style={styles.cardHeading}>
                      {stagedFiles.length === 0 ? 'Start with one or more statement files' : 'Review this staged import batch'}
                    </h3>
                  </div>
                  <div style={styles.headerActions}>
                    <button type="button" style={styles.secondaryButton} onClick={onOpenHistory}>
                      Import history
                    </button>
                    <button type="button" style={styles.secondaryButton} onClick={onBackToDashboard}>
                      Back to dashboard
                    </button>
                  </div>
                </div>

                <div style={styles.metricsRow}>
                  <div style={styles.metricCard}>
                    <span style={styles.metricLabel}>Ready</span>
                    <strong style={styles.metricValue}>{readyCount}</strong>
                    <span style={styles.metricHelper}>Files that can be imported right now.</span>
                  </div>
                  <div style={styles.metricCard}>
                    <span style={styles.metricLabel}>Needs attention</span>
                    <strong style={styles.metricValue}>{blockedCount}</strong>
                    <span style={styles.metricHelper}>Files still needing review, sheet choice, or retry.</span>
                  </div>
                </div>

                <div style={styles.commitRow}>
                  <p style={styles.helper}>
                    {stagedFiles.length === 0
                      ? 'Use the stage action above to add ICICI files. Once files appear here, Walnut will keep ready and blocked outcomes together so you can decide from one place.'
                      : 'Keep this workspace focused on one decision: which files are ready to bring into Walnut right now.'}
                  </p>
                  <button
                    type="button"
                    aria-label="Commit staged import batch"
                    style={{ ...styles.primaryButton, opacity: canImport ? 1 : 0.6 }}
                    onClick={() => void handleCommit()}
                    disabled={!canImport && stagedFiles.length === 0}
                  >
                    Import ready files
                  </button>
                </div>
              </section>

              {sectionOrder.map((section) => {
                const files = stagedFiles.filter((file) => file.status === section.status)
                if (files.length === 0) {
                  return null
                }

                return (
                  <section key={section.status} style={styles.card}>
                    <div style={styles.sectionHeader}>
                      <div>
                        <h3 style={styles.cardHeading}>{section.heading}</h3>
                        <p style={styles.helper}>{section.description}</p>
                      </div>
                      <div style={styles.sectionCount}>{files.length}</div>
                    </div>
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
              <div style={styles.kicker}>Guided checklist</div>
              <h3 style={styles.cardHeading}>Keep the import flow simple</h3>
              <ol style={styles.guidanceList}>
                <li>Stage all ICICI files that belong in the current batch.</li>
                <li>Resolve worksheet choices or review anything blocked on the left.</li>
                <li>Use Import history only if you need earlier-batch context.</li>
                <li>Commit the batch once the Ready section matches what you expect.</li>
              </ol>
            </section>
          )}
        </aside>
      </div>
    </section>
  )
}

const styles = {
  root: {
    width: 'min(100%, 1320px)',
    display: 'grid',
    gap: 'var(--space-xl)'
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.45fr) minmax(300px, 0.75fr)',
    gap: 'var(--space-lg)',
    alignItems: 'start'
  },
  taskColumn: {
    display: 'grid',
    gap: 'var(--space-lg)'
  },
  guidanceColumn: {
    display: 'grid',
    gap: 'var(--space-lg)',
    position: 'sticky' as const,
    top: 24
  },
  card: {
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-xl)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.74)',
    boxShadow: 'var(--shadow-panel)'
  },
  controlCard: {
    display: 'grid',
    gap: 'var(--space-lg)',
    padding: 'var(--space-xl)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid rgba(15, 118, 110, 0.12)',
    background: 'linear-gradient(180deg, rgba(245, 241, 232, 0.86), rgba(226, 215, 197, 0.62))',
    boxShadow: 'var(--shadow-panel)'
  },
  guidanceCard: {
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-xl)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'linear-gradient(180deg, rgba(226, 215, 197, 0.88), rgba(245, 241, 232, 0.82))'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-lg)',
    alignItems: 'flex-start'
  },
  cardTitleBlock: {
    display: 'grid',
    gap: 'var(--space-sm)'
  },
  headerActions: {
    display: 'flex',
    gap: 'var(--space-sm)',
    flexWrap: 'wrap' as const,
    justifyContent: 'flex-end'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-md)',
    alignItems: 'start'
  },
  sectionCount: {
    minWidth: 40,
    height: 40,
    borderRadius: 999,
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(15, 118, 110, 0.08)',
    color: 'var(--color-accent)',
    fontWeight: 800
  },
  metricsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 'var(--space-md)'
  },
  metricCard: {
    display: 'grid',
    gap: 'var(--space-xs)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-md)',
    background: 'rgba(255, 255, 255, 0.56)',
    border: '1px solid rgba(30, 27, 22, 0.08)'
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--color-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em'
  },
  metricValue: {
    fontSize: 28,
    lineHeight: 1.1,
    color: 'var(--color-ink)'
  },
  metricHelper: {
    fontSize: 14,
    color: 'var(--color-muted)'
  },
  commitRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-lg)',
    alignItems: 'end'
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
    color: 'var(--color-muted)',
    lineHeight: 1.45
  },
  list: {
    display: 'grid',
    gap: 'var(--space-md)'
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(30, 27, 22, 0.06)',
    color: 'var(--color-ink)',
    padding: '0 18px',
    fontWeight: 600
  },
  primaryButton: {
    minHeight: 54,
    border: 0,
    borderRadius: 999,
    background: 'var(--color-accent)',
    color: '#fff',
    padding: '0 24px',
    fontWeight: 700,
    whiteSpace: 'nowrap' as const
  },
  guidanceList: {
    margin: 0,
    paddingLeft: 'var(--space-lg)',
    color: 'var(--color-muted)',
    display: 'grid',
    gap: 'var(--space-md)',
    lineHeight: 1.5
  }
} as const
