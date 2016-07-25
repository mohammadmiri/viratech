package ir.viratech.rest_proj.api.user;

import java.util.ArrayList;
import java.util.List;

import ir.viratech.rest_proj.model.user.User;
import ir.viratech.rest_proj.model.user.logic.UserMgr;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.POST;

import org.apache.commons.lang.StringUtils;
import org.igniterealtime.restclient.*;
import org.igniterealtime.restclient.entity.*;


@Path("ChatService")
public class ChatUserManager {
	
	
	/**
	 * the auth information of admin of openfire
	 */
	private final String ADMIN_USERNAME = "admin";
	private final String ADMIN_PASSWORD = "123456789";
	
	/**
	 * the information needed to connect to openfire server
	 */
	private final String OPENFIRE_URL = "http://localhost";
	private final int OPENFIRE_PORT = 9090;
	
	
	/**
	 * insert all users existing in restproj into openfire database
	 */
	@GET
	@Path("/insertusers")
	public void insertToOpenfire(){
		UserMgr usermgr = new UserMgr();
		List<User> restProjUsers = usermgr.list();
		AuthenticationToken authenticationToken = new AuthenticationToken(ADMIN_USERNAME, ADMIN_PASSWORD);
		RestApiClient restApiClient = new RestApiClient(OPENFIRE_URL, OPENFIRE_PORT, authenticationToken);
		List<UserEntity> userEntities = restApiClient.getUsers().getUsers();
		ArrayList<String> usernames = new ArrayList<>();
		for(UserEntity user:userEntities){
			usernames.add(user.getUsername());
		}
		for(User user:restProjUsers){
			if(!usernames.contains(user.getUsername())){
				restApiClient.createUser(createUser(user));
			}
		}
	}
	
	
	
	/**
	 * create a openfire user according to RestProj user property
	 * @param user is the RestProj user
	 * @return a openfire user
	 */
	private UserEntity createUser(User user){
		return new UserEntity(user.getUsername(), user.getFirstName(), "", getHashedPassword(user.getPassword()));
	}
	
	
	
	/**
	 * return the hashed password
	 * @param password is password of RestProj user should be hashed to password of OpenFire user
	 * @return a hashed password
	 */
	private String getHashedPassword(String password){
		return password;
	}
	
	
	/**
	 * 
	 */
	@GET
	@Path("/updateusers")
	public void updateUsers(){
		UserMgr usermgr = new UserMgr();
		List<User> restProjUsers = usermgr.list();
		AuthenticationToken authenticationToken = new AuthenticationToken(ADMIN_USERNAME, ADMIN_PASSWORD);
		RestApiClient restApiClient = new RestApiClient(OPENFIRE_URL, OPENFIRE_PORT, authenticationToken);
		List<UserEntity> userEntities = restApiClient.getUsers().getUsers();
		for(UserEntity userEntity:userEntities){
			if(userEntity.getUsername().equals("admin")){ continue; }
			User user = getUser(restProjUsers, userEntity.getUsername());
			if(user != null && !cmpUsers(userEntity, user)){
				restApiClient.updateUser(updateUserEntity(userEntity, user));
			}
		}
	}
	
	
	
	/**
	 * get a user existing in list users which has special username and if not exists return null 
	 * @param users
	 * @param username
	 * @return
	 */
	private User getUser(List<User> users, String username){
		for(User user:users){
			if(user.getUsername().equals(username)){
				return user;
			}
		}
		return null;
	}
	
	
	/**
	 * compare a user and its equal userEntity and return true if both are same and return false otherwise
	 * @param userEntity
	 * @param user
	 * @return
	 */
	private boolean cmpUsers(UserEntity userEntity, User user){
		if(!StringUtils.equals(user.getFirstName(), userEntity.getName())){
			return false;
		}
		if(!StringUtils.equals(getHashedPassword(user.getPassword()), userEntity.getPassword())){
			return false;
		}
//		if(!(user.getFirstName() == null && userEntity.getName() == null)){
//			return false;
//		}
//		if(user.getFirstName()!=null && !user.getFirstName().equals(userEntity.getName())){
//			return false;
//		}
//		if(!getHashedPassword(user.getPassword()).equals(userEntity.getPassword())){
//			return false;
//		}
		return true;
	}
	
	
	/**
	 * 
	 * @param userEntity
	 * @param user
	 * @return
	 */
	private UserEntity updateUserEntity(UserEntity userEntity, User user){
		userEntity.setName(user.getFirstName());
		userEntity.setPassword(getHashedPassword(user.getPassword()));
		return userEntity;
	}
	
	
	/**
	 * 
	 */
	@GET
	@Path("/deleteusers")
	public void deleteUsers(){
		UserMgr usermgr = new UserMgr();
		List<User> restProjUsers = usermgr.list();
		AuthenticationToken authenticationToken = new AuthenticationToken(ADMIN_USERNAME, ADMIN_PASSWORD);
		RestApiClient restApiClient = new RestApiClient(OPENFIRE_URL, OPENFIRE_PORT, authenticationToken);
		List<UserEntity> userEntities = restApiClient.getUsers().getUsers();
		for(UserEntity userEntity:userEntities){
			if(userEntity.getUsername().equals("admin")){ continue; }
			User user = getUser(restProjUsers, userEntity.getUsername());
			// null means the user does not exist anymore
			if(user == null){
				restApiClient.deleteUser(userEntity.getUsername());
			}
		}
	}
	
	

}
