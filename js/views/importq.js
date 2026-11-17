// Placeholder until this stage is built.
export async function render(root, ctx) {
  ctx.setTop({ title: 'importq', sub: ctx.exam.title });
  root.innerHTML = '<div class="card empty">This screen arrives in a later stage.</div>';
}
