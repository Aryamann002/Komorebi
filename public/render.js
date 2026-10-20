import { daysBetween, formatDate, formatMoney, formatMonth, groupByMonth, localIsoDate } from './format.js';

const IDEA_LABELS = {
  theme: 'Theme',
  decor: 'Decor',
  food: 'Food & drink',
  activities: 'Activities',
  'guest-experience': 'Guest experience',
};

/**
 * Minimal element builder. Text is always assigned through text nodes, so
 * model output can never be interpreted as HTML.
 * @param {string} tag
 * @param {Record<string, unknown>} [props] `class`, `text`, `on<Event>` handlers, or attributes.
 * @param {(Node | string | null | false)[]} [children]
 */
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  node.append(...children.filter((child) => child !== null && child !== false));
  return node;
}

/** Section ids are prefixed so they never collide with form field ids such as `budget`. */
const sectionId = (name) => `section-${name}`;

const card = (name, title, children) =>
  el('section', { class: 'card', id: sectionId(name), 'aria-labelledby': `${sectionId(name)}-title` }, [
    el('h3', { id: `${sectionId(name)}-title`, text: title }),
    ...children,
  ]);

function overview({ input, plan }, { onStartOver }) {
  const daysLeft = daysBetween(localIsoDate(), input.eventDate);
  const stats = [
    daysLeft > 0 ? `${daysLeft} days to go` : 'Event day is here',
    `${formatMoney(Math.round(input.budget / input.guestCount), input.currency)} per guest`,
    `${input.guestCount} guests`,
  ];
  return el('header', { class: 'plan-header' }, [
    el('p', { class: 'eyebrow', text: `${input.location} · ${formatDate(input.eventDate)}` }),
    el('h2', { tabindex: '-1', text: 'Your event plan' }),
    el('p', { class: 'summary', text: plan.summary }),
    el('ul', { class: 'stats', 'aria-label': 'Key numbers' }, stats.map((text) => el('li', { text }))),
    el('div', { class: 'actions no-print' }, [
      el('button', { type: 'button', class: 'button secondary', text: 'Print / Save PDF', onClick: () => window.print() }),
      el('button', { type: 'button', class: 'button ghost', text: 'Start over', onClick: onStartOver }),
    ]),
    el('nav', { class: 'section-nav no-print', 'aria-label': 'Plan sections' }, [
      ['budget', 'Budget'], ['timeline', 'Timeline'], ['vendors', 'Vendors'], ['ideas', 'Ideas'],
    ].map(([name, label]) => el('a', { href: `#${sectionId(name)}`, text: label }))),
  ]);
}

function budgetCard({ input, plan }) {
  const money = (amount) => formatMoney(amount, input.currency);
  const rows = plan.budget.map((item) =>
    el('tr', {}, [
      el('th', { scope: 'row', text: item.category }),
      el('td', { class: 'share' }, [
        el('meter', { class: 'bar', min: 0, max: 100, value: item.percent, 'aria-hidden': 'true' }),
        el('span', { text: `${item.percent}%` }),
      ]),
      el('td', { class: 'amount', text: money(item.amount) }),
      el('td', { class: 'tip', text: item.tip }),
    ]),
  );
  return card('budget', 'Budget', [
    el('div', { class: 'table-scroll', tabindex: '0', role: 'region', 'aria-label': 'Budget table' }, [
      el('table', {}, [
        el('thead', {}, [el('tr', {}, ['Category', 'Share', 'Amount', 'Money-saving tip'].map((text) => el('th', { scope: 'col', text })))]),
        el('tbody', {}, rows),
        el('tfoot', {}, [
          el('tr', {}, [el('th', { scope: 'row', text: 'Total' }), el('td', { text: '100%' }), el('td', { class: 'amount', text: money(input.budget) }), el('td')]),
        ]),
      ]),
    ]),
  ]);
}

const doNowBadge = (item) => item.compressed && el('span', { class: 'badge', text: 'Do now' });

function timelineCard({ plan }) {
  return card('timeline', 'Timeline', groupByMonth(plan.timeline).map(([month, tasks]) =>
    el('div', { class: 'month' }, [
      el('h4', { text: formatMonth(`${month}-01`) }),
      el('ol', { class: 'timeline' }, tasks.map((task) =>
        el('li', {}, [
          el('time', { datetime: task.dueDate, text: formatDate(task.dueDate, { day: 'numeric', month: 'short' }) }),
          el('div', {}, [
            el('p', { class: 'task' }, [task.task, ' ', doNowBadge(task)]),
            el('p', { class: 'muted', text: task.details }),
          ]),
        ]),
      )),
    ]),
  ));
}

function vendorsCard({ plan, checked }, { onToggleVendor }) {
  const done = new Set(checked);
  return card('vendors', 'Vendor checklist', [
    el('ul', { class: 'vendors' }, plan.vendors.map((vendor, index) => {
      const id = `vendor-${index}`;
      return el('li', {}, [
        el('div', { class: 'vendor-head' }, [
          el('input', { type: 'checkbox', id, checked: done.has(index), onChange: (event) => onToggleVendor(index, event.target.checked) }),
          el('label', { for: id, text: vendor.category }),
          el('span', { class: 'book-by' }, [`Book by ${formatDate(vendor.dueDate)}`, ' ', doNowBadge(vendor)]),
        ]),
        el('p', {}, [el('strong', { text: 'Look for: ' }), vendor.lookFor]),
        el('p', { class: 'ask', text: 'Ask them:' }),
        el('ul', { class: 'questions' }, vendor.questions.map((text) => el('li', { text }))),
      ]);
    })),
  ]);
}

function ideasCard({ plan }) {
  return card('ideas', 'Personalised ideas', [
    el('ul', { class: 'ideas' }, plan.ideas.map((idea) =>
      el('li', { class: 'idea' }, [
        el('span', { class: 'tag', text: IDEA_LABELS[idea.area] }),
        el('h4', { text: idea.title }),
        el('p', { text: idea.description }),
        el('p', { class: 'why' }, [el('strong', { text: 'Why it fits you: ' }), idea.whyItFits]),
      ]),
    )),
  ]);
}

/**
 * Replaces the container's content with the full plan.
 * @param {HTMLElement} container
 * @param {{ input: object, plan: object, checked: number[] }} state
 * @param {{ onToggleVendor: (index: number, checked: boolean) => void, onStartOver: () => void }} handlers
 */
export function renderPlan(container, state, handlers) {
  container.replaceChildren(
    overview(state, handlers),
    budgetCard(state),
    timelineCard(state),
    vendorsCard(state, handlers),
    ideasCard(state),
  );
}
