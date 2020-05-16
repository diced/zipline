if ("<%=failed%>" === 'true') {
    Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'You entered a wrong username or password',
        footer: 'Try again later...'
    })
}