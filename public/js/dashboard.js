const TypeX = {
    currentImagePage: 0
}
function whitespace(str) {
    return str === null || str.match(/^ *$/) !== null;
}

function showAlert(type, message) {
    if (type === 'error') {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: message,
            footer: 'Try again later...'
        })
    } else if (type === 'success') {
        Swal.fire({
            icon: 'success',
            title: 'Success',
            text: message,
            footer: 'You did it!'
        })
    }
}

function copyText(text) {
    var input = document.createElement('textarea');
    input.innerHTML = text;
    document.body.appendChild(input);
    input.select();
    var result = document.execCommand('copy');
    document.body.removeChild(input);
    return result;
}

async function redoImageGrid(page) {
    if (!page) return;
    document.getElementById('typexImages').innerHTML = '';
    const resp = await fetch('/api/images/user/pages?page=' + page, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const json = await resp.json();
    console.log(json);
    if (json.error || json.code) return showAlert('error', json.error);
        try {
            json.page.forEach(image => {
                $('#typexImages').append(`
<div class="col-sm-4">
    <div class="card m-2" data-toggle="modal" data-target="#typeximg${image.id}">
        <img class="card-img-top" src="${image.url}" alt="Image ${image.id}">
        <div class="modal fade" id="typeximg${image.id}" tabindex="-1" role="dialog" aria-labelledby="imagelabel${image.id}" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="imagelabel${image.id}">Currenting Managing Image ${image.id}</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button> 
                    </div>
                    <div class="modal-footer">
                        <div class="row" style="width:100%;">
                            <div class="col-sm-6">
                                <button type="button" onclick="window.open('${image.url}', '_blank')" class="btn btn-primary"
                                    style="border-radius: 50px; width:100%;">View Image</button>
                            </div>
                            <div class="col-sm-6">
                                <button type="button" class="btn btn-danger" data-dismiss="modal"
                                    style="border-radius: 50px; width:100%;" onclick="deleteImage('${image.id}', '${image.url}')">Delete Image</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
    `)
            });
    } catch (e) {
        console.error(e)
    }
}

document.getElementById('updateImages').addEventListener('click', async () => {
    redoImageGrid('0');
    document.getElementById('typexImagePagination').innerHTML = '';

    const resp = await fetch('/api/images/user/pages', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const json = await resp.json();
    try {
            json.pagedNums.forEach(p => {
                $('#typexImagePagination').append(`
                <li class="page-item"><a class="page-link" href="#" onclick="redoImageGrid('${p}')">${p+1}</a></li>
                `)
            });
    } catch (e) {
        console.error(e)
    }
});



const deleteImage = (id, url) => {
    Swal.fire({
        title: 'Are you sure?',
        text: `You are proceeding to delete image (${id}), you will not be able to recover it!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it.'
    }).then(async (result) => {
        if (result.value) {
            try {
                const json = await res.json();
                if (json.error || json.code) return showAlert('error', json.error)
                else {
                    const res = await fetch('/api/images?image=' + id, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    try {
                        const json = await res.json();
                        if (json.error || json.code) return showAlert('error', json.error)
                        else {
                            Swal.fire(
                                'Deleted!',
                                `Deleted image (${id}) successfully.`,
                                'success'
                            );
                        }
                    } catch (e) {
                        console.error(e)
                    }
                }
            } catch (e) {
                console.error(e)
            }
        }
    });
}
const deleteSpecificUser = (id, username) => {
    Swal.fire({
        title: 'Are you sure?',
        text: `You are proceeding to delete user ${username} (${id}), you will not be able to recover them!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: `Yes, delete ${username}.`
    }).then(async (result) => {
        if (result.value) {
            try {
                const res = await fetch('/api/user?user=' + id, {
                    method: 'DELETE'
                });
                try {
                    const json = await res.json();
                    if (json.error || json.code) return showAlert('error', json.error)
                    else {
                        Swal.fire(
                            'Deleted!',
                            `Deleted user ${username} (${id}) successfully.`,
                            'success'
                        );
                        window.location.href = '/'
                    }
                } catch (e) {
                    console.error(e)
                }
            } catch (e) {
                console.error(e)
            }
        }
    });
}
document.getElementById('saveUser').addEventListener('click', async () => {
    Swal.fire({
        title: 'Are you sure?',
        text: "You are proceeding to edit your user.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, save changes!'
    }).then(async (result) => {
        if (result.value) {
            const username = document.getElementById('usernameSave').value;
            const password = document.getElementById('passwordSave').value;
            if (whitespace(username)) return showAlert('error', 'Please input a username.')
            const res = await fetch('/api/user', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    password
                })
            });
            try {
                const json = await res.json();
                if (json.error || json.code) return showAlert('error', json.error)
                else {
                    Swal.fire(
                        'Saved Changes!',
                        'Changes were saved successfully!',
                        'success'
                    );
                    window.location.href = '/'
                }
            } catch (e) {
                console.error(e)
            }
        }
    });
});

async function shortURL(token, url) {
    if (whitespace(url)) return showAlert('error', 'Please input a URL.')
    const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'authorization': token
        },
        body: JSON.stringify({
            url
        })
    });
    try {
            let te = await res.text();
            Swal.fire(
                'URL Shortened!',
                `Shorten: <a target="_blank" href="${te}">${te}</a>`,
                'success'
            );
                return;
    } catch (e) {
        if (e.message.startsWith('Unexpected token < in JSON at position')) {
            let te = await res.text();
            Swal.fire(
                'URL Shortened!',
                `Shorten: <a target="_blank" href="${te}">${te}</a>`,
                'success'
            );
            return;
        } else {
            console.error(e)
        }
    }
};

const copyToken = (token) => {
    Swal.fire({
        title: 'Are you sure?',
        text: "You are proceeding to copy your token, make sure NO ONE sees it.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3`085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, copy it!'
    }).then((result) => {
        if (result.value) {
            copyText(token);
            Swal.fire(
                'Copied!',
                'Your API Token has been copied.',
                'success'
            );
        }
    });
};
document.getElementById('regenToken').addEventListener('click', async () => {
    Swal.fire({
        title: 'Are you sure?',
        text: "You are proceeding to regenerate your token, remember all apps using your current one will stop working.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, regenerate it!'
    }).then(async (result) => {
        if (result.value) {
            const res = await fetch('/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            try {
                const json = await res.json();
                if (json.error || json.code) return showAlert('error', json.error)
                else {
                    Swal.fire(
                        'Regenerated!',
                        'Your API Token has been regenerated.',
                        'success'
                    );
                    return window.location.href = '/'
                }
            } catch (e) {
                console.error(e)
            }

        }
    });

});
async function createUser() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    if (whitespace(username)) return showAlert('error', 'Please input a username.')
    const res = await fetch('/api/user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username,
            password,
            administrator: document.getElementById('administrator').checked
        })
    });
    try {
        const json = await res.json();
        if (json.error || json.code) return showAlert('error', json.error)
        else {
            $('#modal').modal('toggle');
            showAlert('success', `Created user ${json.username} (${json.id})`)
            return window.location.href = '/'
        }
    } catch (e) {
        console.error(e)
    }
}
document.getElementById('createUser').addEventListener('click', async () => {
    if (document.getElementById('administrator').checked) {
        Swal.fire({
            title: 'Are you sure?',
            text: "You are proceeding to create a user with administrator permissions, they can do whatever they want!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, create user!'
        }).then(async (result) => {
            if (result.value) {
                createUser()
            }
        });
    } else {
        createUser();
    }
})