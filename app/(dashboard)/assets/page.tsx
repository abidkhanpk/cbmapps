import { getServerSession } from 'next-auth'
import getAuthOptions from '@/lib/auth/config'
import prisma from '@/lib/db'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function ensureDefaultCompany() {
  const company = await prisma.company.findFirst({})
  if (company) return company
  return prisma.company.create({ data: { name: 'Default Company', code: 'DEF' } })
}

export default async function AssetsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const session = await getServerSession(getAuthOptions())
  if (!session?.user?.id) redirect('/login')

  const company = await ensureDefaultCompany()

  // Selection
  const siteSel = typeof searchParams?.site === 'string' ? searchParams!.site : undefined
  const areaSel = typeof searchParams?.area === 'string' ? searchParams!.area : undefined
  const systemSel = typeof searchParams?.system === 'string' ? searchParams!.system : undefined
  const assetSel = typeof searchParams?.asset === 'string' ? searchParams!.asset : undefined

  // Fetch hierarchy
  const sites = await prisma.site.findMany({
    where: { company_id: company.id },
    orderBy: { name: 'asc' },
    include: {
      areas: {
        orderBy: { name: 'asc' },
        include: {
          systems: {
            orderBy: { name: 'asc' },
            include: {
              assets: {
                orderBy: { name: 'asc' },
                include: {
                  components: { orderBy: { name: 'asc' } },
                },
              },
            },
          },
        },
      },
    },
  })

  // server actions
  async function addSite(formData: FormData) {
    'use server'
    const name = String(formData.get('name') || '').trim()
    const code = String(formData.get('code') || '').trim()
    if (!name || !code) return
    await prisma.site.create({ data: { company_id: company.id, name, code } })
    revalidatePath('/assets')
  }

  async function addArea(formData: FormData) {
    'use server'
    const site_id = String(formData.get('site_id') || '')
    const name = String(formData.get('name') || '').trim()
    const code = String(formData.get('code') || '').trim()
    if (!site_id || !name || !code) return
    await prisma.area.create({ data: { site_id, name, code } })
    revalidatePath(`/assets?site=${site_id}`)
  }

  async function addSystem(formData: FormData) {
    'use server'
    const area_id = String(formData.get('area_id') || '')
    const name = String(formData.get('name') || '').trim()
    const code = String(formData.get('code') || '').trim()
    if (!area_id || !name || !code) return
    await prisma.system.create({ data: { area_id, name, code } })
    revalidatePath(`/assets?site=${searchParams?.site || ''}&area=${area_id}`)
  }

  async function addAsset(formData: FormData) {
    'use server'
    const system_id = String(formData.get('system_id') || '')
    const name = String(formData.get('name') || '').trim()
    const tag_code = String(formData.get('tag_code') || '').trim()
    if (!system_id || !name || !tag_code) return
    await prisma.asset.create({ data: { system_id, name, tag_code } })
    revalidatePath(`/assets?site=${searchParams?.site || ''}&area=${searchParams?.area || ''}&system=${system_id}`)
  }

  async function addComponent(formData: FormData) {
    'use server'
    const asset_id = String(formData.get('asset_id') || '')
    const name = String(formData.get('name') || '').trim()
    const component_code = String(formData.get('component_code') || '').trim()
    const type = String(formData.get('type') || 'other') as any
    if (!asset_id || !name || !component_code) return
    await prisma.component.create({ data: { asset_id, name, component_code, type } })
    revalidatePath(`/assets?site=${searchParams?.site || ''}&area=${searchParams?.area || ''}&system=${searchParams?.system || ''}&asset=${asset_id}`)
  }

  // Simple helpers to find selected nodes
  const selectedSite = sites.find((s: any) => s.id === siteSel)
  const selectedArea = selectedSite?.areas.find((a: any) => a.id === areaSel)
  const selectedSystem = selectedArea?.systems.find((sys: any) => sys.id === systemSel)
  const selectedAsset = selectedSystem?.assets.find((as: any) => as.id === assetSel)

  return (
    <div className="container-fluid">
      <div className="row mb-3">
        <div className="col">
          <h1 className="h3 mb-0">Asset Register</h1>
          <div className="text-muted">Manage assets in hierarchy: Plant (Site) &gt; Area &gt; Equipment (System) &gt; Asset &gt; Component</div>
        </div>
      </div>

      <div className="row g-3">
        {/* Tree */}
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header"><strong>Hierarchy</strong></div>
            <div className="card-body" style={{maxHeight: 600, overflow: 'auto'}}>
              <ul className="list-unstyled">
                {sites.map((site: any) => (
                  <li key={site.id} className="mb-2">
                    <div className="d-flex align-items-center">
                      <a href={`/assets?site=${site.id}`} className="text-decoration-none">
                        <i className="bi bi-diagram-3 me-2" />{site.name}
                      </a>
                    </div>
                    {site.id === siteSel && (
                      <ul className="list-unstyled ms-4 mt-1">
                        {site.areas.map((area: any) => (
                          <li key={area.id} className="mb-1">
                            <a href={`/assets?site=${site.id}&area=${area.id}`} className="text-decoration-none">
                              <i className="bi bi-diagram-3-fill me-2" />{area.name}
                            </a>
                            {area.id === areaSel && (
                              <ul className="list-unstyled ms-4 mt-1">
                                {area.systems.map((sys: any) => (
                                  <li key={sys.id} className="mb-1">
                                    <a href={`/assets?site=${site.id}&area=${area.id}&system=${sys.id}`} className="text-decoration-none">
                                      <i className="bi bi-cpu me-2" />{sys.name}
                                    </a>
                                    {sys.id === systemSel && (
                                      <ul className="list-unstyled ms-4 mt-1">
                                        {sys.assets.map((as: any) => (
                                          <li key={as.id} className="mb-1">
                                            <a href={`/assets?site=${site.id}&area=${area.id}&system=${sys.id}&asset=${as.id}`} className="text-decoration-none">
                                              <i className="bi bi-hdd-network me-2" />{as.tag_code || as.name}
                                            </a>
                                            {as.id === assetSel && (
                                              <ul className="list-unstyled ms-4 mt-1">
                                                {as.components.map((c: any) => (
                                                  <li key={c.id} className="mb-1">
                                                    <span className="text-muted"><i className="bi bi-box-seam me-2" />{c.name}</span>
                                                  </li>
                                                ))}
                                              </ul>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Details / CRUD */}
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <strong>Details</strong>
              <a className="btn btn-sm btn-outline-secondary" href="/assets">Reset</a>
            </div>
            <div className="card-body">
              {!siteSel && (
                <div>
                  <div className="fw-semibold mb-2">Add Plant (Site)</div>
                  <form action={addSite} className="row g-2">
                    <div className="col-7">
                      <input name="name" className="form-control form-control-sm" placeholder="Site name" required />
                    </div>
                    <div className="col-5">
                      <input name="code" className="form-control form-control-sm" placeholder="Code" required />
                    </div>
                    <div className="col-12">
                      <button className="btn btn-sm btn-primary" type="submit">Add Site</button>
                    </div>
                  </form>
                  <hr />
                  <div className="text-muted small">Select a Site in the tree to manage Areas.</div>
                </div>
              )}

              {siteSel && !areaSel && (
                <div>
                  <div className="fw-semibold mb-2">Manage Areas in: {selectedSite?.name}</div>
                  <form action={addArea} className="row g-2 mb-3">
                    <input type="hidden" name="site_id" value={siteSel} />
                    <div className="col-7">
                      <input name="name" className="form-control form-control-sm" placeholder="Area name" required />
                    </div>
                    <div className="col-5">
                      <input name="code" className="form-control form-control-sm" placeholder="Code" required />
                    </div>
                    <div className="col-12">
                      <button className="btn btn-sm btn-primary" type="submit">Add Area</button>
                    </div>
                  </form>
                  <table className="table table-sm">
                    <thead><tr><th>Name</th><th>Code</th></tr></thead>
                    <tbody>
                      {selectedSite?.areas.map((a: any) => (
                        <tr key={a.id}><td>{a.name}</td><td>{a.code}</td></tr>
                      ))}
                      {(selectedSite?.areas.length ?? 0) === 0 && (
                        <tr><td colSpan={2} className="text-muted">No areas</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {siteSel && areaSel && !systemSel && (
                <div>
                  <div className="fw-semibold mb-2">Manage Equipment (Systems) in: {selectedArea?.name}</div>
                  <form action={addSystem} className="row g-2 mb-3">
                    <input type="hidden" name="area_id" value={areaSel} />
                    <div className="col-7">
                      <input name="name" className="form-control form-control-sm" placeholder="Equipment name" required />
                    </div>
                    <div className="col-5">
                      <input name="code" className="form-control form-control-sm" placeholder="Code" required />
                    </div>
                    <div className="col-12">
                      <button className="btn btn-sm btn-primary" type="submit">Add Equipment</button>
                    </div>
                  </form>
                  <table className="table table-sm">
                    <thead><tr><th>Name</th><th>Code</th></tr></thead>
                    <tbody>
                      {selectedArea?.systems.map((sy: any) => (
                        <tr key={sy.id}><td>{sy.name}</td><td>{sy.code}</td></tr>
                      ))}
                      {(selectedArea?.systems.length ?? 0) === 0 && (
                        <tr><td colSpan={2} className="text-muted">No equipment</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {siteSel && areaSel && systemSel && !assetSel && (
                <div>
                  <div className="fw-semibold mb-2">Manage Assets in: {selectedSystem?.name}</div>
                  <form action={addAsset} className="row g-2 mb-3">
                    <input type="hidden" name="system_id" value={systemSel} />
                    <div className="col-7">
                      <input name="name" className="form-control form-control-sm" placeholder="Asset name" required />
                    </div>
                    <div className="col-5">
                      <input name="tag_code" className="form-control form-control-sm" placeholder="Tag code" required />
                    </div>
                    <div className="col-12">
                      <button className="btn btn-sm btn-primary" type="submit">Add Asset</button>
                    </div>
                  </form>
                  <table className="table table-sm">
                    <thead><tr><th>Name</th><th>Tag</th></tr></thead>
                    <tbody>
                      {selectedSystem?.assets.map((as: any) => (
                        <tr key={as.id}><td>{as.name}</td><td>{as.tag_code}</td></tr>
                      ))}
                      {(selectedSystem?.assets.length ?? 0) === 0 && (
                        <tr><td colSpan={2} className="text-muted">No assets</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {siteSel && areaSel && systemSel && assetSel && (
                <div>
                  <div className="fw-semibold mb-2">Manage Components in Asset: {selectedAsset?.tag_code || selectedAsset?.name}</div>
                  <form action={addComponent} className="row g-2 mb-3">
                    <input type="hidden" name="asset_id" value={assetSel} />
                    <div className="col-6">
                      <input name="name" className="form-control form-control-sm" placeholder="Component name" required />
                    </div>
                    <div className="col-3">
                      <input name="component_code" className="form-control form-control-sm" placeholder="Code" required />
                    </div>
                    <div className="col-3">
                      <select name="type" className="form-select form-select-sm" defaultValue="other">
                        <option value="mechanical">Mechanical</option>
                        <option value="electrical">Electrical</option>
                        <option value="instrumentation">Instrumentation</option>
                        <option value="rotating">Rotating</option>
                        <option value="static">Static</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <button className="btn btn-sm btn-primary" type="submit">Add Component</button>
                    </div>
                  </form>
                  <table className="table table-sm">
                    <thead><tr><th>Name</th><th>Code</th><th>Type</th></tr></thead>
                    <tbody>
                      {selectedAsset?.components.map((c: any) => (
                        <tr key={c.id}><td>{c.name}</td><td>{c.component_code}</td><td className="text-capitalize">{c.type}</td></tr>
                      ))}
                      {(selectedAsset?.components.length ?? 0) === 0 && (
                        <tr><td colSpan={3} className="text-muted">No components</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
