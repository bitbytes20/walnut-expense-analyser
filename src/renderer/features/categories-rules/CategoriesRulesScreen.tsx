import { useEffect, useMemo, useState } from 'react'
import type {
  CategoryTreeNode,
  CategorizationRuleSummary,
  CreateCategoryInput,
  CreateCategorizationRuleInput,
  RuleApplyPreview,
  UpdateCategoryInput,
  UpdateCategorizationRuleInput
} from '../../../shared/contracts/categories'
import type { TransactionRuleSuggestion } from '../../../shared/contracts/transactions'
import { CategoryEditorPanel } from './CategoryEditorPanel'
import { CategoryPane } from './CategoryPane'
import { RuleEditorPanel } from './RuleEditorPanel'
import { RulePane } from './RulePane'
import { RulePreviewPanel } from './RulePreviewPanel'

type CategoryEditorState =
  | { mode: 'create' }
  | { mode: 'edit'; category: CategoryTreeNode }
  | null

type RuleEditorState =
  | { mode: 'create'; draft?: TransactionRuleSuggestion['draft'] }
  | { mode: 'edit'; rule: CategorizationRuleSummary }
  | null

interface CategoriesRulesScreenProps {
  initialRuleDraft?: TransactionRuleSuggestion['draft']
  onRuleDraftHandled?: () => void
}

const flattenCategories = (nodes: CategoryTreeNode[]): CategoryTreeNode[] =>
  nodes.flatMap((node) => [node, ...flattenCategories(node.children)])

export const CategoriesRulesScreen = ({ initialRuleDraft, onRuleDraftHandled }: CategoriesRulesScreenProps) => {
  const [categories, setCategories] = useState<CategoryTreeNode[]>([])
  const [rules, setRules] = useState<CategorizationRuleSummary[]>([])
  const [categoryEditor, setCategoryEditor] = useState<CategoryEditorState>(null)
  const [ruleEditor, setRuleEditor] = useState<RuleEditorState>(null)
  const [rulePreview, setRulePreview] = useState<RuleApplyPreview>()
  const [previewRuleId, setPreviewRuleId] = useState<string>()

  const reload = async () => {
    const [nextCategories, nextRules] = await Promise.all([window.walnut.listCategories(), window.walnut.listRules()])
    setCategories(nextCategories)
    setRules(nextRules)
  }

  useEffect(() => {
    void reload()
  }, [])

  useEffect(() => {
    if (initialRuleDraft) {
      setRuleEditor({ mode: 'create', draft: initialRuleDraft })
      onRuleDraftHandled?.()
    }
  }, [initialRuleDraft, onRuleDraftHandled])

  const categoryOptions = useMemo(
    () =>
      flattenCategories(categories).map((category) => ({
        id: category.id,
        label: category.path.join(' > '),
        kind: category.kind,
        isActive: category.isActive
      })),
    [categories]
  )

  const handleSaveCategory = async (input: CreateCategoryInput | UpdateCategoryInput) => {
    if ('categoryId' in input) {
      setCategories(await window.walnut.updateCategory(input))
    } else {
      setCategories(await window.walnut.createCategory(input))
    }
    setCategoryEditor(null)
  }

  const handleMergeCategory = async (sourceCategoryId: string, targetCategoryId: string) => {
    setCategories(await window.walnut.mergeCategory({ sourceCategoryId, targetCategoryId }))
    setCategoryEditor(null)
  }

  const handleDeleteCategory = async (categoryId: string) => {
    setCategories(await window.walnut.deleteCategory({ categoryId }))
    setCategoryEditor(null)
  }

  const handleSaveRule = async (input: CreateCategorizationRuleInput | UpdateCategorizationRuleInput, previewAfterSave?: boolean) => {
    const nextRules =
      'ruleId' in input ? await window.walnut.updateRule(input) : await window.walnut.createRule(input)
    setRules(nextRules)

    if (previewAfterSave) {
      const matchedRule =
        [...nextRules]
          .reverse()
          .find((rule) => rule.name === input.name && rule.kind === 'user') ??
        ('ruleId' in input ? nextRules.find((rule) => rule.id === input.ruleId) : undefined)

      if (matchedRule) {
        setPreviewRuleId(matchedRule.id)
        setRulePreview(await window.walnut.previewRuleApplyToExisting({ ruleId: matchedRule.id }))
      }
    } else {
      setRuleEditor(null)
    }
  }

  return (
    <section style={styles.root}>
      <section style={styles.headerCard}>
        <div>
          <div style={styles.kicker}>Category automation workspace</div>
          <h2 style={styles.heading}>Categories &amp; Rules</h2>
          <p style={styles.helper}>Keep the built-in taxonomy protected, manage your own categories, and preview reusable automation before it touches existing transactions.</p>
        </div>
        <div style={styles.headerActions}>
          <button type="button" style={styles.secondaryButton} onClick={() => setCategoryEditor({ mode: 'create' })}>
            New category
          </button>
          <button type="button" style={styles.primaryButton} onClick={() => setRuleEditor({ mode: 'create' })}>
            New rule
          </button>
        </div>
      </section>

      <div style={styles.workspace}>
        <CategoryPane categories={categories} onCreate={() => setCategoryEditor({ mode: 'create' })} onEdit={(category) => setCategoryEditor({ mode: 'edit', category })} />
        <RulePane
          rules={rules}
          onCreate={() => setRuleEditor({ mode: 'create' })}
          onEdit={(rule) => setRuleEditor({ mode: 'edit', rule })}
          onToggle={async (rule) => setRules(await window.walnut.toggleRule({ ruleId: rule.id, isEnabled: !rule.isEnabled }))}
        />
      </div>

      {categoryEditor ? (
        <CategoryEditorPanel
          mode={categoryEditor.mode}
          category={categoryEditor.mode === 'edit' ? categoryEditor.category : undefined}
          categoryOptions={categoryOptions}
          onClose={() => setCategoryEditor(null)}
          onSave={handleSaveCategory}
          onMerge={handleMergeCategory}
          onDelete={handleDeleteCategory}
        />
      ) : null}

      {ruleEditor ? (
        <RuleEditorPanel
          mode={ruleEditor.mode}
          rule={ruleEditor.mode === 'edit' ? ruleEditor.rule : undefined}
          draft={ruleEditor.mode === 'create' ? ruleEditor.draft : undefined}
          categoryOptions={categoryOptions}
          onClose={() => {
            setRuleEditor(null)
            setRulePreview(undefined)
            setPreviewRuleId(undefined)
          }}
          onSave={handleSaveRule}
          onDelete={async (ruleId) => {
            setRules(await window.walnut.deleteRule({ ruleId }))
            setRuleEditor(null)
          }}
          onTest={async (previewInput) => {
            setRulePreview(await window.walnut.testRule(previewInput))
            setPreviewRuleId(undefined)
          }}
          onPreviewApply={async (input) => {
            await handleSaveRule(input, true)
          }}
        />
      ) : null}

      {rulePreview ? (
        <RulePreviewPanel
          preview={rulePreview}
          onClose={() => {
            setRulePreview(undefined)
            setPreviewRuleId(undefined)
            setRuleEditor(null)
          }}
          onApply={
            previewRuleId
              ? async () => {
                  setRules(await window.walnut.applyRuleToExisting({ ruleId: previewRuleId }))
                  setRulePreview(undefined)
                  setPreviewRuleId(undefined)
                  setRuleEditor(null)
                }
              : undefined
          }
        />
      ) : null}
    </section>
  )
}

const styles = {
  root: {
    display: 'grid',
    gap: 'var(--space-lg)'
  },
  headerCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'end',
    gap: 'var(--space-lg)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.72)',
    boxShadow: 'var(--shadow-panel)'
  },
  kicker: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-accent)'
  },
  heading: {
    margin: 'var(--space-sm) 0 0 0',
    fontSize: 'var(--font-display-size)',
    lineHeight: 1.1
  },
  helper: {
    margin: 'var(--space-sm) 0 0 0',
    color: 'var(--color-muted)',
    maxWidth: 760
  },
  headerActions: {
    display: 'flex',
    gap: 'var(--space-sm)',
    flexWrap: 'wrap' as const
  },
  workspace: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.02fr) minmax(0, 0.98fr)',
    gap: 'var(--space-lg)',
    alignItems: 'start'
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
    minHeight: 44,
    border: 0,
    borderRadius: 999,
    background: 'var(--color-accent)',
    color: '#fff',
    padding: '0 18px',
    fontWeight: 700
  }
} as const
