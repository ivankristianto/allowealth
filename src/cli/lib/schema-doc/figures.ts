import {
  bottom,
  box,
  centerX,
  edge,
  edgeLabel,
  escapeHtml,
  junctionDot,
  left,
  markerDefs,
  plainPath,
  right,
  rowY,
  svg,
  top,
  drawBox,
} from './svg';

/**
 * Hand-placed diagram layouts. Each figure shows the columns its argument
 * hinges on, not every column; the generated table reference covers the rest.
 *
 * Grid: four 220px columns at x = 20 / 290 / 560 / 830 with 50px gutters.
 * Gutters double as routing channels for orthogonal edges.
 */
const COL_A = 20;
const COL_B = 290;
const COL_C = 560;
const COL_D = 830;

/** The eleven tables that hold the household's money. */
export function financialCoreFigure(): string {
  const p = 'f1';
  const budgets = box(
    COL_A,
    30,
    'budgets',
    [
      ['id', 'pk'],
      ['category_id', 'fk'],
      ['month · year', '', '1–12 · yyyy'],
      ['budget_amount', 'money'],
      ['currency'],
      ['is_closed', '', 'book closing'],
    ],
    { ws: true }
  );
  const budgetCategories = box(
    COL_A,
    240,
    'budget_categories',
    [
      ['id', 'pk'],
      ['name'],
      ['type', 'enum', 'expense | income'],
      ['income_source_type', 'enum'],
      ['icon · color', '', 'lucide · daisy'],
      ['is_active'],
    ],
    { ws: true }
  );
  const transactions = box(
    COL_B,
    30,
    'transactions',
    [
      ['id', 'pk'],
      ['type', 'enum', 'exp | inc | transfer'],
      ['account_id', 'fk', 'source'],
      ['to_account_id', 'fkn', 'transfers only'],
      ['category_id', 'fkn', 'null on transfer'],
      ['amount', 'money'],
      ['currency'],
      ['transaction_date'],
      ['deleted_at', '', 'soft delete'],
    ],
    { ws: true }
  );
  const occurrences = box(
    COL_B,
    280,
    'recurring_occurrences',
    [
      ['id', 'pk'],
      ['template_id', 'fk'],
      ['transaction_id', 'fkn', 'unique'],
      ['due_date'],
      ['occurrence_number'],
      ['status', 'enum', 'pending | conf | skip'],
      ['confirmed_amount', 'money'],
    ],
    { ws: true }
  );
  const templates = box(
    COL_B,
    490,
    'recurring_templates',
    [
      ['id', 'pk'],
      ['category_id', 'fk'],
      ['account_id', 'fk'],
      ['amount', 'money'],
      ['frequency · interval', '', 'wk | mo'],
      ['day_of_month'],
      ['is_installment'],
      ['status', 'enum', 'active | paused | …'],
    ],
    { ws: true }
  );
  const accounts = box(
    COL_C,
    30,
    'accounts',
    [
      ['id', 'pk'],
      ['category_id', 'fkn'],
      ['type', 'enum', '10 types'],
      ['account_class', 'enum', '3 classes'],
      ['balance', 'money', 'current'],
      ['initial_balance', 'money'],
      ['currency'],
      ['credit_limit', 'money', 'cards'],
      ['status', 'enum', 'active | closed'],
      ['deleted_at', '', 'soft delete'],
    ],
    { ws: true }
  );
  const snapshotItems = box(COL_C, 490, 'account_snapshot_items', [
    ['id', 'pk'],
    ['snapshot_id', 'fk'],
    ['account_id', 'fk'],
    ['balance', 'money', 'copied'],
    ['currency'],
  ]);
  const accountCategories = box(
    COL_D,
    30,
    'account_categories',
    [['id', 'pk'], ['name', '', 'unique per ws'], ['is_liability'], ['is_system'], ['sort_order']],
    { ws: true }
  );
  const history = box(COL_D, 190, 'account_history', [
    ['id', 'pk'],
    ['account_id', 'fk'],
    ['balance', 'money', 'append-only'],
    ['recorded_at'],
  ]);
  const reminders = box(
    COL_D,
    330,
    'account_update_reminders',
    [
      ['id', 'pk'],
      ['account_id', 'fk'],
      ['frequency', 'enum', 'wk | mo | qtr'],
      ['next_reminder'],
      ['is_dismissed'],
    ],
    { ws: true }
  );
  const snapshots = box(
    COL_D,
    490,
    'account_snapshots',
    [['id', 'pk'], ['snapshot_date'], ['month · year'], ['notes']],
    { ws: true }
  );

  const edges = [
    edge(`M${centerX(budgets)} ${bottom(budgets)}V${top(budgetCategories)}`, 'solid', p),
    edgeLabel(
      centerX(budgets) + 8,
      (bottom(budgets) + top(budgetCategories)) / 2 + 4,
      'category_id'
    ),
    edge(
      `M${left(transactions)} ${rowY(transactions, 4)}H265V${budgetCategories.y + 40}H${right(budgetCategories)}`,
      'dashed',
      p
    ),
    edge(
      `M${left(templates)} ${rowY(templates, 1)}H265V${budgetCategories.y + 92}H${right(budgetCategories)}`,
      'solid',
      p
    ),
    edge(`M${right(transactions)} ${rowY(transactions, 2)}H${left(accounts)}`, 'solid', p),
    edge(`M${right(transactions)} ${rowY(transactions, 3)}H${left(accounts)}`, 'dashed', p),
    edge(
      `M${right(templates)} ${rowY(templates, 2)}H535V${accounts.y + 175}H${left(accounts)}`,
      'solid',
      p
    ),
    edge(`M${centerX(occurrences)} ${bottom(occurrences)}V${top(templates)}`, 'solid', p),
    edgeLabel(
      centerX(occurrences) + 8,
      (bottom(occurrences) + top(templates)) / 2 + 4,
      'template_id'
    ),
    edge(`M${centerX(occurrences)} ${top(occurrences)}V${bottom(transactions)}`, 'dashed', p),
    edgeLabel(
      centerX(occurrences) + 8,
      (top(occurrences) + bottom(transactions)) / 2 + 4,
      'transaction_id · 1:1'
    ),
    edge(`M${right(accounts)} ${rowY(accounts, 1)}H${left(accountCategories)}`, 'dashed', p),
    edge(
      `M${left(history)} ${rowY(history, 1)}H815V${accounts.y + 150}H${right(accounts)}`,
      'solid',
      p
    ),
    edge(
      `M${left(reminders)} ${rowY(reminders, 1)}H800V${accounts.y + 186}H${right(accounts)}`,
      'solid',
      p
    ),
    edge(`M${centerX(snapshotItems)} ${top(snapshotItems)}V${bottom(accounts)}`, 'solid', p),
    edgeLabel(
      centerX(snapshotItems) + 8,
      (top(snapshotItems) + bottom(accounts)) / 2 + 4,
      'account_id'
    ),
    edge(`M${right(snapshotItems)} ${rowY(snapshotItems, 1)}H${left(snapshots)}`, 'solid', p),
  ].join('');

  const boxes = [
    budgets,
    budgetCategories,
    transactions,
    occurrences,
    templates,
    accounts,
    snapshotItems,
    accountCategories,
    history,
    reminders,
    snapshots,
  ];
  const height = Math.max(...boxes.map(bottom)) + 20;
  return svg(
    1070,
    height,
    'Financial tables. Transactions, budgets and recurring templates point at budget categories; transactions and recurring templates point at accounts; account history, reminders and snapshot items hang off accounts. Every table except account_history and account_snapshot_items carries workspace_id.',
    markerDefs(p) + edges + boxes.map(drawBox).join('')
  );
}

/** Better Auth identity on the left, app-owned membership on the right, joined by a shared id. */
export function identityFigure(): string {
  const p = 'f2';
  const y0 = 40;
  const session = box(COL_A, y0, 'session', [
    ['token', '', 'cookie'],
    ['userId', 'fk'],
    ['expiresAt'],
  ]);
  const authAccount = box(COL_A, y0 + 110, 'account', [
    ['providerId', '', 'credential | google'],
    ['accountId'],
    ['userId', 'fk'],
    ['password', '', 'hash'],
  ]);
  const twoFactor = box(COL_A, y0 + 240, 'twoFactor', [
    ['userId', 'fk', 'unique'],
    ['secret'],
    ['backupCodes'],
  ]);
  const passkey = box(COL_A, y0 + 350, 'passkey', [
    ['userId', 'fk'],
    ['credentialID', '', 'unique'],
    ['publicKey'],
  ]);
  const verification = box(COL_A, y0 + 460, 'verification', [
    ['identifier', '', 'no FK'],
    ['value'],
    ['expiresAt'],
  ]);
  const authUser = box(COL_B, y0, 'user', [
    ['id', 'pk'],
    ['email', '', 'unique'],
    ['emailVerified'],
    ['twoFactorEnabled'],
  ]);
  const oauthApp = box(COL_B, y0 + 290, 'oauthApplication', [
    ['clientId', '', 'unique'],
    ['redirectUrls'],
    ['userId', '', 'no FK'],
  ]);
  const oauthToken = box(COL_B, y0 + 393, 'oauthAccessToken', [
    ['accessToken', '', 'unique'],
    ['clientId'],
    ['userId', '', 'no FK'],
  ]);
  const oauthConsent = box(COL_B, y0 + 496, 'oauthConsent', [
    ['clientId'],
    ['userId', '', 'no FK'],
    ['scopes'],
  ]);
  const users = box(COL_C, y0, 'users', [
    ['id', 'pk', '= user.id'],
    ['workspace_id', 'fkn'],
    ['role', 'enum', 'admin | member | super'],
    ['email', '', 'unique'],
    ['deleted_at', '', 'member removed'],
  ]);
  const userMeta = box(COL_C, y0 + 160, 'user_meta', [
    ['user_id', 'fk'],
    ['meta_key', '', 'unique per user'],
    ['meta_value', '', '≤ 4 KB'],
  ]);
  const auditLogs = box(
    COL_C,
    y0 + 280,
    'audit_logs',
    [
      ['action'],
      ['user_id', 'fk'],
      ['entity_type · entity_id'],
      ['old_value · new_value', '', 'JSON'],
    ],
    { ws: true }
  );
  const workspaces = box(COL_D, y0, 'workspaces', [
    ['id', 'pk'],
    ['name'],
    ['status', 'enum', 'active | inactive'],
  ]);
  const workspaceMeta = box(COL_D, y0 + 120, 'workspace_meta', [
    ['workspace_id', 'fk'],
    ['meta_key', '', 'unique per ws'],
    ['meta_value'],
  ]);
  const invitations = box(COL_D, y0 + 240, 'workspace_invitations', [
    ['workspace_id', 'fk'],
    ['email'],
    ['token', '', 'unique'],
    ['role', 'enum', 'admin | member'],
    ['expires_at · accepted_at'],
  ]);

  const busX = 265;
  const legacyY = y0 + 430;
  const legacyTables = [
    'sessions',
    'password_reset_tokens',
    'email_verification_tokens',
    'oauth_accounts',
    'user_mfa',
    'user_mfa_backup_codes',
  ];
  const legacyChips = legacyTables
    .map((name, index) => {
      const x = 572 + (index % 2) * 240;
      const y = legacyY + 34 + Math.floor(index / 2) * 34;
      return `<g class="d-chip"><rect x="${x}" y="${y}" width="228" height="26" rx="4"/><text x="${x + 10}" y="${y + 17}">${escapeHtml(name)}</text></g>`;
    })
    .join('');
  const height = Math.max(bottom(oauthConsent), legacyY + 34 + 3 * 34 + 8) + 20;
  const oauthGroupTop = oauthApp.y - 32;

  const parts = [
    `<line class="d-divider" x1="535" x2="535" y1="8" y2="${height - 8}"/>`,
    `<text class="d-zone" x="20" y="22">MANAGED BY BETTER AUTH</text>`,
    `<text class="d-zone" x="560" y="22">OWNED BY THE APP</text>`,
    `<rect class="d-group" x="278" y="${oauthGroupTop}" width="244" height="${bottom(oauthConsent) - oauthApp.y + 44}" rx="8"/>`,
    `<text class="d-grouplabel" x="290" y="${oauthApp.y - 13}">MCP OAuth provider</text>`,
    `<rect class="d-group" x="560" y="${legacyY}" width="490" height="${3 * 34 + 42}" rx="8"/>`,
    `<text class="d-grouplabel" x="572" y="${legacyY + 21}">Legacy auth tables · each user_id → users · cleanup pending</text>`,
    legacyChips,
    edge(`M${right(session)} ${rowY(session, 1)}H${left(authUser)}`, 'solid', p),
    plainPath(
      `M${right(authAccount)} ${rowY(authAccount, 2)}H${busX}M${right(twoFactor)} ${rowY(twoFactor, 0)}H${busX}`
    ),
    edge(
      `M${right(passkey)} ${rowY(passkey, 0)}H${busX}V${authUser.y + 85}H${left(authUser)}`,
      'solid',
      p
    ),
    junctionDot(busX, rowY(authAccount, 2)),
    junctionDot(busX, rowY(twoFactor, 0)),
    edgeLabel(busX + 6, rowY(passkey, 0) - 6, 'userId'),
    edge(`M${right(authUser)} ${rowY(authUser, 0)}H${left(users)}`, 'key', p),
    edgeLabel(535, rowY(authUser, 0) - 8, 'same id', 'middle', 'd-keylabel'),
    edge(`M${centerX(authUser)} ${oauthGroupTop}V${bottom(authUser)}`, 'soft', p),
    edgeLabel(
      centerX(authUser) + 8,
      (bottom(authUser) + oauthGroupTop) / 2 + 4,
      'userId · not enforced'
    ),
    edge(`M${right(users)} ${rowY(users, 1)}H${left(workspaces)}`, 'dashed', p),
    edge(`M${centerX(userMeta)} ${top(userMeta)}V${bottom(users)}`, 'solid', p),
    edgeLabel(centerX(userMeta) + 8, (top(userMeta) + bottom(users)) / 2 + 4, 'user_id'),
    edge(
      `M${right(auditLogs)} ${rowY(auditLogs, 1)}H795V${users.y + 104}H${right(users)}`,
      'solid',
      p
    ),
    edge(`M${centerX(workspaceMeta)} ${top(workspaceMeta)}V${bottom(workspaces)}`, 'solid', p),
    edge(
      `M${right(invitations)} ${rowY(invitations, 0)}H1065V${workspaces.y + 40}H${right(workspaces)}`,
      'solid',
      p
    ),
    [
      session,
      authAccount,
      twoFactor,
      passkey,
      verification,
      authUser,
      oauthApp,
      oauthToken,
      oauthConsent,
      users,
      userMeta,
      auditLogs,
      workspaces,
      workspaceMeta,
      invitations,
    ]
      .map(drawBox)
      .join(''),
  ].join('');

  return svg(
    1080,
    height,
    "Identity tables. Better Auth's user table and the app's users table share the same id with no foreign key between them. Better Auth's session, account, twoFactor and passkey reference user. The app's users table optionally points at workspaces; user_meta and audit_logs point at users; workspace_meta and workspace_invitations point at workspaces.",
    markerDefs(p) + parts
  );
}

interface FlowNode {
  x: number;
  y: number;
  w: number;
  title: string;
  subtitle: string;
  muted?: boolean;
}

function drawFlowNode(node: FlowNode): string {
  return (
    `<g class="d-node${node.muted ? ' d-node-muted' : ''}"><rect x="${node.x}" y="${node.y}" width="${node.w}" height="46" rx="6"/>` +
    `<text class="d-ntitle" x="${node.x + 12}" y="${node.y + 19}">${escapeHtml(node.title)}</text>` +
    `<text class="d-nsub" x="${node.x + 12}" y="${node.y + 36}">${escapeHtml(node.subtitle)}</text></g>`
  );
}

/** Ledger lane and balance lane, deliberately unconnected: transactions never move balances. */
export function moneyLanesFigure(): string {
  const p = 'f3';
  const ledgerY = 50;
  const balanceY = 230;
  const n = {
    template: {
      x: 20,
      y: ledgerY,
      w: 170,
      title: 'recurring_templates',
      subtitle: 'status = active',
    },
    pending: { x: 250, y: ledgerY, w: 150, title: 'occurrence', subtitle: 'status = pending' },
    confirmed: { x: 460, y: ledgerY, w: 150, title: 'occurrence', subtitle: 'status = confirmed' },
    skipped: {
      x: 460,
      y: ledgerY + 76,
      w: 150,
      title: 'occurrence',
      subtitle: 'status = skipped',
      muted: true,
    },
    transactions: {
      x: 670,
      y: ledgerY,
      w: 150,
      title: 'transactions',
      subtitle: 'one row per event',
    },
    reports: {
      x: 880,
      y: ledgerY,
      w: 170,
      title: 'budgets & reports',
      subtitle: 'actuals by month',
      muted: true,
    },
    user: {
      x: 20,
      y: balanceY,
      w: 170,
      title: 'User updates balance',
      subtitle: 'or transfers',
      muted: true,
    },
    balance: { x: 250, y: balanceY, w: 150, title: 'accounts.balance', subtitle: 'overwritten' },
    history: { x: 460, y: balanceY, w: 150, title: 'account_history', subtitle: 'row appended' },
    snapshots: {
      x: 670,
      y: balanceY,
      w: 150,
      title: 'account_snapshots',
      subtitle: '+ one item per account',
    },
    netWorth: {
      x: 880,
      y: balanceY,
      w: 170,
      title: 'net worth trend',
      subtitle: 'balances over time',
      muted: true,
    },
  } satisfies Record<string, FlowNode>;
  const end = (node: FlowNode) => node.x + node.w;
  const mid = (node: FlowNode) => node.y + 23;
  const step = (from: FlowNode, to: FlowNode, text: string, style: 'solid' | 'key' = 'solid') =>
    edge(`M${end(from)} ${mid(from)}H${to.x}`, style, p) +
    edgeLabel(
      (end(from) + to.x) / 2,
      mid(from) - 7,
      text,
      'middle',
      style === 'key' ? 'd-keylabel' : ''
    );
  const dividerY = (ledgerY + 122 + balanceY - 40) / 2;

  const parts = [
    `<text class="d-zone" x="20" y="28">LEDGER · WHAT HAPPENED</text>`,
    `<text class="d-zone" x="20" y="${balanceY - 22}">BALANCES · WHAT YOU HAVE</text>`,
    `<line class="d-divider" x1="20" x2="1050" y1="${dividerY}" y2="${dividerY}"/>`,
    step(n.template, n.pending, 'generates'),
    step(n.pending, n.confirmed, 'confirm'),
    edge(
      `M${end(n.pending) - 30} ${n.pending.y + 46}V${mid(n.skipped)}H${n.skipped.x}`,
      'dashed',
      p
    ),
    edgeLabel(end(n.pending) - 24, mid(n.skipped) - 7, 'skip'),
    step(n.confirmed, n.transactions, 'inserts', 'key'),
    step(n.transactions, n.reports, 'summed'),
    step(n.user, n.balance, 'sets'),
    step(n.balance, n.history, 'logs'),
    step(n.history, n.snapshots, 'month-end'),
    step(n.snapshots, n.netWorth, 'charts'),
    Object.values(n).map(drawFlowNode).join(''),
  ].join('');

  return svg(
    1070,
    balanceY + 66,
    'Two independent lanes. Ledger: an active recurring template generates pending occurrences; confirming one inserts a transaction, and transactions are summed into budgets and reports. Balances: the user sets an account balance, which logs an account_history row and feeds month-end snapshots and the net worth trend. No arrow connects the two lanes: transactions never change account balances.',
    markerDefs(p) + parts
  );
}
