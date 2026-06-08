import { useState } from "react"

const AdminClientForm = () => {
  const [formData, setFormData] = useState({
    rutEmpresa: "",
    nombreEmpresa: "",
    direccionEmpresa: "",
    nombreUsuario: "",
    correo: "",
    telefono: "",
    cargo: ""
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">

      <input name="rutEmpresa" placeholder="RUT Empresa"
        onChange={handleChange}
        className="input-style"
      />

      <input name="nombreEmpresa" placeholder="Nombre Empresa"
        onChange={handleChange}
        className="input-style"
      />

      <input name="direccionEmpresa" placeholder="Dirección Empresa"
        onChange={handleChange}
        className="input-style md:col-span-2"
      />

      <input name="nombreUsuario" placeholder="Nombre Usuario"
        onChange={handleChange}
        className="input-style"
      />

      <input name="correo" placeholder="Correo"
        onChange={handleChange}
        className="input-style"
      />

      <input name="telefono" placeholder="Teléfono"
        onChange={handleChange}
        className="input-style"
      />

      <input name="cargo" placeholder="Cargo"
        onChange={handleChange}
        className="input-style"
      />

      <button
        type="submit"
        className="md:col-span-2 bg-[#87be00] hover:bg-[#6e9e00] 
                   text-white py-3 rounded-lg font-medium transition"
      >
        Crear Administrador Cliente
      </button>

    </form>
  )
}

export default AdminClientForm