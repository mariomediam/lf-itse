import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@store/authStore'
import useProductsStore from '@store/productsStore'
import ProductsTable from '../components/ProductsTable'
import AddProductModal from '../components/AddProductModal'
import EditProductModal from '../components/EditProductModal'

function ProductsPage() {
  const { user, logout } = useAuthStore()
  const { products, loading, fetchProducts, deleteProduct } = useProductsStore()
  const navigate = useNavigate()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [productToEdit, setProductToEdit] = useState(null)

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleDelete = async (id) => {
    await deleteProduct(id)
  }

  const handleEdit = (product) => {
    setProductToEdit(product)
  }

  const handleCloseEditModal = () => {
    setProductToEdit(null)
  }

  const handleAddProduct = () => {
    setIsAddModalOpen(true)
  }

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
            {user && (
              <p className="text-sm text-gray-600 mt-1">
                Bienvenido, <span className="font-semibold">{user.username}</span>
              </p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-200"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Lista de productos</h2>
              <button
                onClick={handleAddProduct}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200"
              >
                Añadir producto
              </button>
            </div>

            <ProductsTable
              products={products}
              loading={loading}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />

            {!loading && products.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Mostrando <span className="font-medium">1</span> a{' '}
                  <span className="font-medium">{products.length}</span> de{' '}
                  <span className="font-medium">{products.length}</span> resultados
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <AddProductModal isOpen={isAddModalOpen} onClose={handleCloseAddModal} />
      <EditProductModal product={productToEdit} onClose={handleCloseEditModal} />
    </div>
  )
}

export default ProductsPage