 import { useEffect, useState } from 'react'
import { FiEdit2, FiTrash2, FiPlus, FiX, FiAlertTriangle } from 'react-icons/fi'
import AdminSidebar from '../components/AdminSidebar'
import AdminTopbar from '../components/AdminTopbar'
import { SidebarProvider } from '../components/SidebarContext'
import {
  getAdminCategories,
  addAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
} from '../services/adminService'
import './AdminCategories.css'

// بيانات وهمية مؤقتة لحد ما يجهز endpoint من نور
const FALLBACK_CATEGORIES = [
  { id: 1, name: 'المأكولات المنزلية', productsCount: 148, createdAt: '2023-08-15' },
  { id: 2, name: 'ملابس', productsCount: 312, createdAt: '2023-08-15' },
  { id: 3, name: 'الاشغال اليدوية', productsCount: 274, createdAt: '2023-09-01' },
]

export default function AdminCategories() {
  return (
    <SidebarProvider>
      <AdminCategoriesContent />
    </SidebarProvider>
  )
}

function AdminCategoriesContent() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  // موديل الإضافة/التعديل: null = مسكر، { mode: 'add' } أو { mode: 'edit', category }
  const [formModal, setFormModal] = useState(null)
  const [formValue, setFormValue] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  // موديل الحذف
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await getAdminCategories()
        setCategories(res.data)
      } catch (err) {
        console.error('فشل تحميل التصنيفات', err)
        setCategories(FALLBACK_CATEGORIES)
      } finally {
        setLoading(false)
      }
    }
    fetchCategories()
  }, [])

  // فتح موديل الإضافة
  const openAddModal = () => {
    setFormValue('')
    setFormError('')
    setFormModal({ mode: 'add' })
  }

  // فتح موديل التعديل
  const openEditModal = (category) => {
    setFormValue(category.name)
    setFormError('')
    setFormModal({ mode: 'edit', category })
  }

  const closeFormModal = () => {
    setFormModal(null)
    setFormValue('')
    setFormError('')
  }

  const handleFormSubmit = async () => {
    const trimmed = formValue.trim()
    if (!trimmed) {
      setFormError('اسم التصنيف مطلوب')
      return
    }

    setSaving(true)
    try {
      if (formModal.mode === 'add') {
        const res = await addAdminCategory(trimmed)
        const newCategory = res?.data || {
          id: Date.now(),
          name: trimmed,
          productsCount: 0,
          createdAt: new Date().toISOString().slice(0, 10),
        }
        setCategories((prev) => [...prev, newCategory])
      } else {
        await updateAdminCategory(formModal.category.id, trimmed)
        setCategories((prev) =>
          prev.map((c) =>
            c.id === formModal.category.id ? { ...c, name: trimmed } : c
          )
        )
      }
      closeFormModal()
    } catch (err) {
      console.error('فشل حفظ التصنيف', err)
      setFormError('حدث خطأ أثناء الحفظ، حاولي مرة أخرى')
    } finally {
      setSaving(false)
    }
  }

  // موديل الحذف
  const openDeleteModal = (category) => {
    setDeleteTarget(category)
  }

  const closeDeleteModal = () => {
    setDeleteTarget(null)
  }

  const handleConfirmDelete = async () => {
    setDeleting(true)
    try {
      await deleteAdminCategory(deleteTarget.id)
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      closeDeleteModal()
    } catch (err) {
      console.error('فشل حذف التصنيف', err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="admin-categories-page">
      <AdminTopbar />

      <div className="admin-categories-page__body">
        <AdminSidebar />

        <main className="admin-categories-page__content">
          <div className="categories-header">
            

            <div className="categories-header__title-group">
              <h1 className="admin-categories-page__title">إدارة التصنيفات</h1>
              <p className="admin-categories-page__subtitle">{categories.length} تصنيف</p>
            </div>

             <button type="button" className="add-category-btn" onClick={openAddModal}>
              <FiPlus /> إضافة تصنيف
            </button>

          </div>

           

          <div className="categories-table-card">
            {loading ? (
              <p className="categories-loading">جاري التحميل...</p>
            ) : categories.length === 0 ? (
              <p className="categories-empty">لا يوجد تصنيفات بعد</p>
            ) : (
              <table className="categories-table">
              <thead>
                <tr>
                    <th>اسم التصنيف</th>
                    <th>المنتجات</th>
                    <th>تاريخ الإنشاء</th>
                    <th>إجراءات</th>
                </tr>
                </thead>
                <tbody>
                {categories.map((cat) => (
                    <tr key={cat.id}>
                    <td className="category-name-cell">{cat.name}</td>
                    <td className="text-muted">{cat.productsCount}</td>
                    <td className="text-muted">{cat.createdAt}</td>
                    <td>
                        <div className="table-actions">
                        <button
                            type="button"
                            className="icon-btn icon-btn--edit"
                            onClick={() => openEditModal(cat)}
                            aria-label="تعديل"
                        >
                            <FiEdit2 />
                        </button>
                        <button
                            type="button"
                            className="icon-btn icon-btn--delete"
                            onClick={() => openDeleteModal(cat)}
                            aria-label="حذف"
                        >
                            <FiTrash2 />
                        </button>
                        </div>
                    </td>
                    </tr>
                ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {/* موديل الإضافة / التعديل */}
      {formModal && (
        <div className="modal-overlay" onClick={closeFormModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-box__header">
              <button
                type="button"
                className="modal-close-btn"
                onClick={closeFormModal}
                aria-label="إغلاق"
              >
                <FiX />
              </button>
              <h3>{formModal.mode === 'add' ? 'إضافة تصنيف جديد' : 'تعديل التصنيف'}</h3>
            </div>

            <div className="modal-box__body">
              <label className="modal-field-label">
                {formModal.mode === 'add' ? 'اسم التصنيف' : 'تعديل التصنيف'}{' '}
                <span className="required-star">*</span>
              </label>
              <input
                type="text"
                className="modal-input"
                placeholder="مثال: ملابس"
                value={formValue}
                onChange={(e) => {
                  setFormValue(e.target.value)
                  setFormError('')
                }}
                autoFocus
              />
              {formError && <p className="modal-error">{formError}</p>}
            </div>

            <div className="modal-box__actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleFormSubmit}
                disabled={saving}
              >
                {saving ? 'جارٍ الحفظ...' : 'إضافة'}
              </button>
              <button type="button" className="btn btn--outline" onClick={closeFormModal}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* موديل الحذف */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal-box modal-box--delete" onClick={(e) => e.stopPropagation()}>
            <div className="delete-icon-circle">
              <FiTrash2 />
            </div>
            <h3 className="delete-title">حذف التصنيف</h3>
            <p className="delete-message">
              هل أنت متأكد أنك تريد حذف هذا التصنيف؟ لا يمكن التراجع عن هذا الإجراء
            </p>

            <div className="modal-box__actions modal-box__actions--center">
              <button
                type="button"
                className="btn btn--danger"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? 'جارٍ الحذف...' : 'نعم احذف'}
              </button>
              <button type="button" className="btn btn--outline" onClick={closeDeleteModal}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}