import { useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'flowbite-react'
import useProductsStore from '@store/productsStore'

function AddProductModal({ isOpen, onClose }) {
  const { addProduct } = useProductsStore()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    const result = await addProduct({
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price)
    })

    setIsSubmitting(false)

    if (result.success) {
      setFormData({ name: '', description: '', price: '' })
      onClose()
    }
  }

  const handleClose = () => {
    setFormData({ name: '', description: '', price: '' })
    onClose()
  }

  return (
    <Modal show={isOpen} size="md" onClose={handleClose}>
      <ModalHeader className="border-b border-gray-200">
        <span className="text-xl font-semibold text-gray-900">Añadir Producto</span>
      </ModalHeader>
      <ModalBody className="bg-white">
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <label htmlFor="name" className="block mb-2 text-sm font-medium text-gray-900">
              Nombre del producto
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Ej: Laptop HP"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400"
            />
          </div>

          <div>
            <label htmlFor="description" className="block mb-2 text-sm font-medium text-gray-900">
              Descripción
            </label>
            <textarea
              id="description"
              name="description"
              placeholder="Descripción del producto..."
              value={formData.description}
              onChange={handleChange}
              rows={4}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400 resize-none"
            />
          </div>

          <div>
            <label htmlFor="price" className="block mb-2 text-sm font-medium text-gray-900">
              Precio (€)
            </label>
            <input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.price}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400"
            />
          </div>
        </form>
      </ModalBody>
      <ModalFooter className="border-t border-gray-200 bg-white">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar producto'}
        </button>
        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
      </ModalFooter>
    </Modal>
  )
}

export default AddProductModal
