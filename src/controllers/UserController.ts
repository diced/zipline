// import { FastifyReply, FastifyRequest, FastifyInstance } from 'fastify';
// import { Controller, GET, POST, FastifyInstanceToken, Inject, Hook } from 'fastify-decorators';
// import { UserNotFoundError, MissingBodyData, LoginError, UserExistsError, NotAdministratorError } from '../lib/api/APIErrors';
// import { User } from '../lib/Data';
// import { checkPassword, createToken, encryptPassword } from '../lib/Encryption';

// @Controller('/api/user')
// export class UserController {
//   @Inject(FastifyInstanceToken)
//   private instance!: FastifyInstance;

//   @GET('/login-status')
//   async loginStatus(req: FastifyRequest, reply: FastifyReply) {
//     return reply.send({ user: !!req.cookies.zipline });
//   }

//   @GET('/current')
//   async currentUser(req: FastifyRequest, reply: FastifyReply) {
//     if (!req.cookies.zipline) throw new LoginError(`Not logged in.`);
//     const user = await this.instance.mongo.db.collection('zipline_users').findOne({ _id: new this.instance.mongo.ObjectId(req.cookies.zipline) });
//     if (!user) throw new UserExistsError(`User doesn't exist`);
//     delete user.password;
//     return reply.send(user);
//   }

//   @POST('/login')
//   async login(req: FastifyRequest<{ Body: { username: string, password: string } }>, reply: FastifyReply) {
//     if (req.cookies.zipline) throw new LoginError(`Already logged in.`)
//     if (!req.body.username) throw new MissingBodyData(`Missing username.`);
//     if (!req.body.password) throw new MissingBodyData(`Missing uassword.`);

//     const user: User = await this.instance.mongo.db.collection('zipline_users').findOne({
//       username: req.body.username
//     });

//     if (!user) throw new UserNotFoundError(`User "${req.body.username}" was not found.`);
//     if (!checkPassword(req.body.password, user.password)) throw new LoginError(`Wrong credentials!`);
//     delete user.password;
//     return reply
//       .setCookie("zipline", user._id, { path: '/' })
//       .send(user);
//   }

//   @POST('/logout')
//   async logout(req: FastifyRequest, reply: FastifyReply) {
//     if (!req.cookies.zipline) throw new LoginError(`Not logged in.`);
//     try {
//       reply.clearCookie('zipline', { path: '/' }).send({ clearStore: true })
//     } catch (e) {
//       reply.send({ clearStore: false });
//     }
//   }

//   @POST('/reset-token')
//   async resetToken(req: FastifyRequest, reply: FastifyReply) {
//     if (!req.cookies.zipline) throw new LoginError(`Not logged in.`);

//     const users = this.instance.mongo.db.collection('zipline_users');
//     const user: User = await users.findOne({ _id: new this.instance.mongo.ObjectId(req.cookies.zipline) });
//     if (!user) throw new UserNotFoundError(`User was not found.`);

//     users.updateOne({ _id: new this.instance.mongo.ObjectId(req.cookies.zipline) }, { $set: { token: createToken() } });
//     return reply.send({ updated: true });
//   }

//   @POST('/create')
//   async create(req: FastifyRequest<{ Body: { username: string, password: string, administrator: boolean } }>, reply: FastifyReply) {
//     if (!req.body.username) throw new MissingBodyData(`Missing username.`);
//     if (!req.body.password) throw new MissingBodyData(`Missing uassword.`);

//     const users = this.instance.mongo.db.collection('zipline_users');

//     const existingUser = await users.findOne({ username: req.body.username });
//     if (existingUser) throw new UserExistsError('User exists already');

//     const newUser: User = {
//       username: req.body.username,
//       password: encryptPassword(req.body.password),
//       token: createToken(),
//       administrator: req.body.administrator
//     };

//     try {
//       users.insertOne(newUser);
//     } catch (e) {
//       throw new Error(`Could not create user: ${e.message}`);
//     }

//     return reply.send(newUser);
//   }

//   @Hook('preValidation')
//   public async preValidation(req: FastifyRequest, reply: FastifyReply) {
//     const adminRoutes = ['/api/user/create'];

//     if (adminRoutes.includes(req.routerPath)) {
//       if (!req.cookies.zipline) return reply.send({ error: "You are not logged in" });

//       const admin = await this.instance.mongo.db.collection('zipline_users').findOne({ _id: req.cookies.zipline });
//       if (!admin) return reply.send({ error: "You are not an administrator" });
//       return;
//     }
//     return;
//   }
// }